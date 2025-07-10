import BaseService from '../base/BaseService.js'
import ResourceQueryDTO from '../model/queryDTO/ResourceQueryDTO.js'
import Resource from '../model/entity/Resource.js'
import ResourceDao from '../dao/ResourceDao.js'
import DB from '../database/DB.js'
import { AssertNotBlank, AssertNotNullish } from '../util/AssertUtil.js'
import { BOOL } from '../constant/BOOL.js'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish, NotNullish } from '../util/CommonUtil.js'
import { GlobalVar, GlobalVars } from '../base/GlobalVar.js'
import StringUtil from '../util/StringUtil.js'
import LogUtil from '../util/LogUtil.js'
import { AddSuffix, CreateDirIfNotExists, SanitizeFileName } from '../util/FileSysUtil.js'
import path from 'path'
import ResourceSaveDTO from '../model/dto/ResourceSaveDTO.js'
import { AuthorRank } from '../constant/AuthorRank.js'
import SiteAuthorRankDTO from '../model/dto/SiteAuthorRankDTO.js'
import LocalAuthorRankDTO from '../model/dto/LocalAuthorRankDTO.js'
import ResourceWriter from '../util/ResourceWriter.js'
import { FileSaveResult } from '../constant/FileSaveResult.js'
import fs from 'fs'
import WorksFullDTO from '../model/dto/WorksFullDTO.js'
import ResFileNameFormatEnum from '../constant/ResFileNameFormatEnum.js'
import BackupService from './BackupService.js'
import { BackupSourceTypeEnum } from '../constant/BackupSourceTypeEnum.js'
import { rename, rm } from 'node:fs/promises'
import Backup from '../model/entity/Backup.js'

/**
 * 资源服务
 */
export default class ResourceService extends BaseService<ResourceQueryDTO, Resource, ResourceDao> {
  constructor(db?: DB) {
    super(ResourceDao, db)
  }

  /**
   * 创建用于保存资源的资源信息
   * @param worksFullDTO
   */
  public static async createSaveInfo(worksFullDTO: WorksFullDTO): Promise<ResourceSaveDTO> {
    const result = new ResourceSaveDTO()
    // 读取设置中的工作目录信息
    const workdir = GlobalVar.get(GlobalVars.SETTINGS).store.workdir
    if (StringUtil.isBlank(workdir)) {
      const msg = `保存资源失败，工作目录不能为空，taskId: ${result.taskId}`
      LogUtil.error(this.constructor.name, msg)
      throw new Error(msg)
    }
    const resource = worksFullDTO.resource
    AssertNotNullish(resource, `保存资源失败，资源信息不能为空，taskId: ${result.taskId}`)

    // 作者信息
    const authorName = ResourceService.getAuthorName(worksFullDTO)

    // 保存路径
    const standardAuthorName = SanitizeFileName(authorName)
    const finalAuthorName = StringUtil.isBlank(standardAuthorName) ? 'InvalidAuthorName' : standardAuthorName
    const filenameExtension = worksFullDTO.resource?.filenameExtension

    const fileName = this.createFileName(worksFullDTO)
    const standardFileName = SanitizeFileName(fileName)
    const finalFileName = StringUtil.isBlank(standardFileName) ? 'noname' : `${standardFileName}${filenameExtension}`

    const relativeSavePath = path.join('/includeDir', finalAuthorName)

    // 资源
    result.fileName = finalFileName
    result.fullSavePath = path.join(workdir, relativeSavePath, finalFileName)
    result.filePath = path.join(relativeSavePath, finalFileName)
    result.workdir = workdir
    result.importMethod = resource.importMethod
    result.suggestedName = resource.suggestedName
    result.filenameExtension = filenameExtension
    result.resourceSize = worksFullDTO.resource?.resourceSize
    result.resourceComplete = BOOL.FALSE

    return result
  }

  /**
   * 保存资源
   * @param resourceSaveDTO
   * @param resourceWriter
   */
  public async saveResource(resourceSaveDTO: ResourceSaveDTO, resourceWriter: ResourceWriter): Promise<FileSaveResult> {
    const resourceId = resourceSaveDTO.id
    AssertNotNullish(resourceId, this.constructor.name, `保存作品资源失败，资源id不能为空`)
    AssertNotNullish(resourceSaveDTO.taskId, this.constructor.name, `保存作品资源失败，任务id不能为空`)
    AssertNotNullish(
      resourceSaveDTO.resourceStream,
      this.constructor.name,
      `保存作品资源失败，资源不能为空，taskId: ${resourceSaveDTO.taskId}`
    )
    AssertNotNullish(
      resourceSaveDTO.fullSavePath,
      this.constructor.name,
      `保存作品资源失败，资源的保存路径不能为空，worksId: ${resourceSaveDTO.worksId}`
    )

    if (NotNullish(resourceSaveDTO.resourceSize)) {
      resourceWriter.resourceSize = resourceSaveDTO.resourceSize
    } else {
      LogUtil.warn(this.constructor.name, `插件没有返回任务${resourceWriter}的资源的大小`)
      resourceWriter.resourceSize = 0
    }

    try {
      // 创建保存目录
      await CreateDirIfNotExists(path.dirname(resourceSaveDTO.fullSavePath))
      // 创建写入流
      const writeStream = fs.createWriteStream(resourceSaveDTO.fullSavePath)

      // 配置resourceWriter
      resourceWriter.readable = resourceSaveDTO.resourceStream
      resourceWriter.writable = writeStream
      resourceWriter.resource = new Resource(resourceSaveDTO)

      // 创建写入Promise
      return resourceWriter.doWrite().then((saveResult) => {
        this.resourceFinished(resourceId)
        // TODO 保存完成后比较一下原本存在数据库中的资源信息和保存用的资源信息
        return saveResult
      })
    } catch (error) {
      const msg = `保存作品资源失败，taskId: ${resourceSaveDTO.taskId}`
      LogUtil.error(this.constructor.name, msg, error)
      throw error
    }
  }

  /**
   * 恢复保存资源
   * @param resourceSaveDTO
   * @param resourceWriter resourceWriter
   * @param bytesWritten
   */
  public async resumeSaveResource(
    resourceSaveDTO: ResourceSaveDTO,
    resourceWriter: ResourceWriter,
    bytesWritten: number
  ): Promise<FileSaveResult> {
    AssertNotNullish(resourceSaveDTO.taskId, this.constructor.name, `恢复保存资源失败，任务id不能为空`)
    AssertNotNullish(
      resourceSaveDTO.resourceStream,
      this.constructor.name,
      `恢复保存资源失败，资源不能为空，taskId: ${resourceSaveDTO.taskId}`
    )

    const resourceId = resourceSaveDTO.id
    AssertNotNullish(resourceId, this.constructor.name, `恢复保存资源失败，资源id不能为空`)

    const oldRes = await this.getById(resourceId)
    AssertNotNullish(oldRes, this.constructor.name, `恢复保存资源失败，资源信息不可用`)
    AssertNotNullish(oldRes.filePath, this.constructor.name, `恢复保存资源失败，原有资源路径不能为空`)

    const workdir = GlobalVar.get(GlobalVars.SETTINGS).get('workdir')
    const oldAbsolutePath = path.join(workdir, oldRes.filePath)

    const newFullSavePath = StringUtil.isBlank(resourceSaveDTO.fullSavePath) ? oldAbsolutePath : resourceSaveDTO.fullSavePath

    try {
      // 创建保存目录
      await CreateDirIfNotExists(path.dirname(oldAbsolutePath))
      // 创建写入流
      const writeable: fs.WriteStream = fs.createWriteStream(oldAbsolutePath, { flags: 'a' })
      writeable.bytesWritten = bytesWritten

      // 配置resourceWriter
      resourceWriter.resourceSize = IsNullish(resourceSaveDTO.resourceSize) ? -1 : resourceSaveDTO.resourceSize
      resourceWriter.readable = resourceSaveDTO.resourceStream
      resourceWriter.writable = writeable
      resourceWriter.resource = new Resource(resourceSaveDTO)

      // 创建写入Promise
      return resourceWriter.doWrite().then(async (saveResult) => {
        // 如果保存路径发生改变，移动到新路径
        if (oldAbsolutePath !== resourceSaveDTO.fullSavePath) {
          await rename(oldAbsolutePath, newFullSavePath)
        }
        this.resourceFinished(resourceId)
        // TODO 保存完成后比较一下原本存在数据库中的资源信息和保存用的资源信息
        return saveResult
      })
    } catch (error) {
      const msg = `保存作品资源失败，taskId: ${resourceSaveDTO.taskId}`
      LogUtil.error(this.constructor.name, msg, error)
      throw error
    }
  }

  /**
   * 新增启用的资源
   * @param resource
   */
  public async saveActive(resource: Resource): Promise<number> {
    AssertNotNullish(resource.worksId, `资源设置为启用失败，worksId不能为空`)
    resource.state = BOOL.TRUE
    const oldRes = await this.listByWorksId(resource.worksId)
    if (ArrayNotEmpty(oldRes)) {
      oldRes.forEach((res) => (res.state = BOOL.FALSE))
      await this.updateBatchById(oldRes)
    }
    return this.save(resource)
  }

  /**
   * 替换资源
   * @param resourceSaveDTO
   * @param resourceWriter
   */
  public async replaceResource(resourceSaveDTO: ResourceSaveDTO, resourceWriter: ResourceWriter): Promise<FileSaveResult> {
    const resourceId = resourceSaveDTO.id
    AssertNotNullish(resourceId, this.constructor.name, `替换资源失败，资源id不能为空`)
    AssertNotNullish(
      resourceSaveDTO.resourceStream,
      this.constructor.name,
      `替换作品资源失败，资源不能为空，worksId: ${resourceSaveDTO.worksId}`
    )
    AssertNotNullish(
      resourceSaveDTO.fullSavePath,
      this.constructor.name,
      `替换作品资源失败，资源的保存路径不能为空，worksId: ${resourceSaveDTO.worksId}`
    )
    const oldResource = await this.getById(resourceId)
    AssertNotNullish(oldResource, this.constructor.name, `替换资源失败，资源不存在`)
    AssertNotBlank(
      oldResource.filePath,
      this.constructor.name,
      `替换作品资源失败，原作品资源的路径不能为空，worksId: ${resourceSaveDTO.worksId}`
    )

    if (NotNullish(resourceSaveDTO.resourceSize)) {
      resourceWriter.resourceSize = resourceSaveDTO.resourceSize
    } else {
      LogUtil.warn(this.constructor.name, `插件没有返回任务${resourceWriter}的资源的大小`)
      resourceWriter.resourceSize = 0
    }

    // 创建备份
    const settings = GlobalVar.get(GlobalVars.SETTINGS)
    const workdir = settings.get('workdir')
    const oldResAbsolutePath = path.join(workdir, oldResource.filePath)
    const backupService = new BackupService()
    const backupAbsolutePath = AddSuffix(oldResAbsolutePath, '-lsBackup')
    let backupPromise: Promise<Backup | undefined> | undefined
    try {
      // 先重命名文件再创建备份，避免原文件占用新的资源的名称
      await fs.promises.access(oldResAbsolutePath)
      await rename(oldResAbsolutePath, backupAbsolutePath)
      backupPromise = backupService
        .createBackup(BackupSourceTypeEnum.WORKS, resourceId, backupAbsolutePath)
        .then((backup) => {
          rm(backupAbsolutePath)
          return backup
        })
        .catch(() => {
          // TODO 通知用户创建备份失败
          return undefined
        })
    } catch (error) {
      LogUtil.warn(this.constructor.name, '替换资源时未创建备份，因为原文件不存在，', error)
    }

    try {
      // 创建保存目录
      await CreateDirIfNotExists(path.dirname(resourceSaveDTO.fullSavePath))
      // 创建写入流
      const writeStream = fs.createWriteStream(resourceSaveDTO.fullSavePath)

      // 配置resourceWriter
      resourceWriter.readable = resourceSaveDTO.resourceStream
      resourceWriter.writable = writeStream
      resourceWriter.resource = new Resource(resourceSaveDTO)

      // 创建写入Promise
      return resourceWriter.doWrite().then((saveResult) => {
        const tempResForUpdate = new Resource(resourceSaveDTO)
        tempResForUpdate.id = resourceId
        this.updateById(tempResForUpdate)
        return saveResult
      })
    } catch (error) {
      const backup = await backupPromise
      if (NotNullish(backup)) {
        backupService.recoverToPath(backup.id as number, oldResAbsolutePath).catch((recoverError) => {
          LogUtil.error(this.constructor.name, '恢复资源失败', recoverError)
          throw recoverError
        })
      }
      const msg = `替换资源失败，taskId: ${resourceSaveDTO.taskId}`
      LogUtil.error(this.constructor.name, msg, error)
      throw error
    }
  }

  /**
   * 资源设置为启用
   * @param id
   * @param worksId
   */
  public async setActive(id: number, worksId?: number): Promise<number> {
    let allRes: Resource[]
    if (IsNullish(worksId)) {
      const target = await this.getById(id)
      AssertNotNullish(target, `资源设置为启用失败，资源id: ${id}不可用`)
      AssertNotNullish(target.worksId, `资源设置为启用失败，worksId不能为空`)
      allRes = await this.listByWorksId(target.worksId)
    } else {
      allRes = await this.listByWorksId(worksId)
    }
    allRes.forEach((res) => {
      if (res.id === id) {
        res.state = BOOL.TRUE
      } else {
        res.state = BOOL.FALSE
      }
    })
    return this.updateBatchById(allRes)
  }

  /**
   * 清除作品不活跃的资源
   * @param worksId
   */
  public clearInactiveByWorksId(worksId: number): Promise<number> {
    const query = new ResourceQueryDTO()
    query.worksId = worksId
    query.state = BOOL.FALSE
    return this.delete(query)
  }

  /**
   * 资源状态改为已完成
   * @param id 资源id
   */
  public async resourceFinished(id: number): Promise<number> {
    const resource = new Resource()
    resource.id = id
    resource.resourceComplete = BOOL.TRUE
    return this.updateById(resource)
  }

  /**
   * 根据作品id查询启用的资源
   * @param worksId
   */
  public getActiveByWorksId(worksId: number): Promise<Resource | undefined> {
    const query = new ResourceQueryDTO()
    query.worksId = worksId
    query.state = BOOL.TRUE
    return this.get(query)
  }

  /**
   * 查询作品id是否有启用的资源
   * @param worksId
   */
  public hasActiveByWorksId(worksId: number): Promise<boolean> {
    return this.dao.hasActiveByWorksId(worksId)
  }

  /**
   * 根据作品id查询所有资源
   * @param worksId
   */
  public listByWorksId(worksId: number): Promise<Resource[]> {
    const query = new ResourceQueryDTO()
    query.worksId = worksId
    return this.list(query)
  }

  /**
   * 创建资源文件名
   * @description 根据setting.worksSettings.fileNameFormat给出的格式化字符串创建文件名
   * @param worksFullInfo
   */
  public static createFileName(worksFullInfo: WorksFullDTO): string {
    // TODO 还有一部分类型没有进行处理；对ResFileNameFormatEnum.AUTHOR的处理逻辑还有问题；作者级别的处理也有问题
    const fileNameFormat = GlobalVar.get(GlobalVars.SETTINGS).get('worksSettings').fileNameFormat
    const getReplacement = (token: string): string => {
      switch (token) {
        case ResFileNameFormatEnum.AUTHOR.token:
          return this.getAuthorName(worksFullInfo)
        case ResFileNameFormatEnum.LOCAL_AUTHOR_NAME.token:
          return this.getLocalAuthorName(worksFullInfo)
        case ResFileNameFormatEnum.SITE_AUTHOR_NAME.token:
          return this.getSiteAuthorName(worksFullInfo)
        case ResFileNameFormatEnum.SITE_AUTHOR_ID.token:
          return this.getSiteAuthorId(worksFullInfo)
        case ResFileNameFormatEnum.SITE_WORKS_ID.token:
          return IsNullish(worksFullInfo.siteWorksId) ? 'invalidSiteWorksId' : worksFullInfo.siteWorksId
        case ResFileNameFormatEnum.SITE_WORKS_NAME.token:
          return IsNullish(worksFullInfo.siteWorksName) ? 'invalidSiteWorksName' : worksFullInfo.siteWorksName
        case ResFileNameFormatEnum.DESCRIPTION.token:
          return IsNullish(worksFullInfo.siteWorkDescription) ? '' : worksFullInfo.siteWorkDescription
        case ResFileNameFormatEnum.DOWNLOAD_TIME_DAY.token:
          return Date.now().toString()
        default:
          return token
      }
    }
    return fileNameFormat.replace(/(\$\{[A-z]+})/g, getReplacement)
  }

  /**
   * 获取作者名称
   * @param worksFullInfo
   * @private
   */
  private static getAuthorName(worksFullInfo: WorksFullDTO): string {
    const mainLocalAuthors: LocalAuthorRankDTO[] = ArrayIsEmpty(worksFullInfo.localAuthors)
      ? []
      : worksFullInfo.localAuthors.filter((localAuthor) => localAuthor.authorRank === AuthorRank.RANK_0)
    const mainSiteAuthors: SiteAuthorRankDTO[] = ArrayIsEmpty(worksFullInfo.siteAuthors)
      ? []
      : worksFullInfo.siteAuthors.filter((siteAuthor) => siteAuthor.authorRank === AuthorRank.RANK_0)
    const localAuthorName = ArrayIsEmpty(mainLocalAuthors)
      ? undefined
      : StringUtil.isBlank(mainLocalAuthors[0].authorName)
        ? undefined
        : mainLocalAuthors[0].authorName
    const siteAuthorName = ArrayIsEmpty(mainSiteAuthors)
      ? undefined
      : StringUtil.isBlank(mainSiteAuthors[0].authorName)
        ? undefined
        : mainSiteAuthors[0].authorName
    if (NotNullish(localAuthorName)) {
      return localAuthorName
    }
    if (NotNullish(siteAuthorName)) {
      return siteAuthorName
    }
    return 'invalidAuthorName'
  }

  /**
   * 获取本地作者名称
   * @param worksFullInfo
   * @private
   */
  private static getLocalAuthorName(worksFullInfo: WorksFullDTO): string {
    const mainLocalAuthors: LocalAuthorRankDTO[] = ArrayIsEmpty(worksFullInfo.localAuthors)
      ? []
      : worksFullInfo.localAuthors.filter((localAuthor) => localAuthor.authorRank === AuthorRank.RANK_0)
    return ArrayIsEmpty(mainLocalAuthors)
      ? 'invalidAuthorName'
      : StringUtil.isBlank(mainLocalAuthors[0].authorName)
        ? ''
        : mainLocalAuthors[0].authorName
  }

  /**
   * 获取站点作者名称
   * @param worksFullInfo
   * @private
   */
  private static getSiteAuthorName(worksFullInfo: WorksFullDTO): string {
    const mainSiteAuthors: SiteAuthorRankDTO[] = ArrayIsEmpty(worksFullInfo.siteAuthors)
      ? []
      : worksFullInfo.siteAuthors.filter((siteAuthor) => siteAuthor.authorRank === AuthorRank.RANK_0)
    return ArrayIsEmpty(mainSiteAuthors)
      ? 'invalidAuthorName'
      : StringUtil.isBlank(mainSiteAuthors[0].authorName)
        ? ''
        : mainSiteAuthors[0].authorName
  }

  /**
   * 获取站点作者id
   * @param worksFullInfo
   * @private
   */
  private static getSiteAuthorId(worksFullInfo: WorksFullDTO): string {
    const mainSiteAuthors: SiteAuthorRankDTO[] = ArrayIsEmpty(worksFullInfo.siteAuthors)
      ? []
      : worksFullInfo.siteAuthors.filter((siteAuthor) => siteAuthor.authorRank === AuthorRank.RANK_0)
    return ArrayIsEmpty(mainSiteAuthors)
      ? 'invalidAuthorId'
      : StringUtil.isBlank(mainSiteAuthors[0].siteAuthorId)
        ? ''
        : mainSiteAuthors[0].siteAuthorId
  }
}
