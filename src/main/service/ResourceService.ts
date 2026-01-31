import BaseService from '../base/BaseService.js'
import ResourceQueryDTO from '../model/queryDTO/ResourceQueryDTO.js'
import Resource from '../model/entity/Resource.js'
import ResourceDao from '../dao/ResourceDao.js'
import DatabaseClient from '../database/DatabaseClient.js'
import { AssertNotBlank, AssertNotNullish } from '../util/AssertUtil.js'
import { BOOL } from '../constant/BOOL.js'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish, NotNullish } from '../util/CommonUtil.js'
import StringUtil from '../util/StringUtil.js'
import LogUtil from '../util/LogUtil.js'
import { AddSuffix, CreateDirIfNotExists, SanitizeFileName } from '../util/FileSysUtil.js'
import path from 'path'
import ResourceSaveDTO from '../model/dto/ResourceSaveDTO.js'
import { AuthorRank } from '../constant/AuthorRank.js'
import RankedSiteAuthor from '../model/domain/RankedSiteAuthor.ts'
import RankedLocalAuthor from '../model/domain/RankedLocalAuthor.ts'
import ResourceWriter from '../util/ResourceWriter.js'
import { FileSaveResult } from '../constant/FileSaveResult.js'
import fs from 'fs'
import WorkFullDTO from '../model/dto/WorkFullDTO.ts'
import ResFileNameFormatEnum from '../constant/ResFileNameFormatEnum.js'
import BackupService from './BackupService.js'
import { BackupSourceTypeEnum } from '../constant/BackupSourceTypeEnum.js'
import { rename, rm } from 'node:fs/promises'
import Backup from '../model/entity/Backup.js'
import { SendNotifyToWindow } from '../util/MainWindowUtil.js'
import { Operator } from '../constant/CrudConstant.ts'
import { getSettings } from '../core/settings.ts'
import PluginWorkResponseDTO from '../model/dto/PluginWorkResponseDTO.ts'

/**
 * 资源服务
 */
export default class ResourceService extends BaseService<ResourceQueryDTO, Resource, ResourceDao> {
  constructor(db?: DatabaseClient) {
    super(ResourceDao, db)
  }

  /**
   * 创建用于保存资源的资源信息
   * @param workInfo 作品完整信息
   * @param pluginResponse 插件返回的数据
   * @param taskId 任务id
   */
  public static createSaveInfoFromPlugin(
    workInfo: WorkFullDTO,
    pluginResponse: PluginWorkResponseDTO,
    taskId: number
  ): ResourceSaveDTO {
    const result = new ResourceSaveDTO()
    // 读取设置中的工作目录信息
    const workdir = getSettings().store.workdir
    if (StringUtil.isBlank(workdir)) {
      const msg = `保存资源失败，工作目录不能为空，taskId: ${result.taskId}`
      LogUtil.error(this.constructor.name, msg)
      throw new Error(msg)
    }
    const pluginResDTO = pluginResponse.resource
    AssertNotNullish(pluginResDTO, `保存资源失败，资源信息不能为空，taskId: ${result.taskId}`)

    // 作者信息
    const authorName = ResourceService.getAuthorName(workInfo)

    // 保存路径
    const standardAuthorName = SanitizeFileName(authorName)
    const finalAuthorName = StringUtil.isBlank(standardAuthorName) ? 'InvalidAuthorName' : standardAuthorName
    const filenameExtension = pluginResDTO.filenameExtension

    const fileName = this.createFileName(workInfo)
    const standardFileName = SanitizeFileName(fileName)
    const finalFileName = StringUtil.isBlank(standardFileName) ? 'noname' : `${standardFileName}${filenameExtension}`

    const relativeSavePath = path.join('/includeDir', finalAuthorName)

    // 资源
    result.workId = workInfo.id
    result.taskId = taskId
    result.fileName = finalFileName
    result.fullSavePath = path.join(workdir, relativeSavePath, finalFileName)
    result.filePath = path.join(relativeSavePath, finalFileName)
    result.workdir = workdir
    result.importMethod = pluginResDTO.importMethod
    result.suggestedName = pluginResDTO.suggestedName
    result.filenameExtension = filenameExtension
    result.resourceSize = pluginResDTO.resourceSize
    result.resourceComplete = BOOL.FALSE
    result.resourceStream = pluginResDTO.resourceStream

    return result
  }

  /**
   * 保存资源
   * @param resourceSaveDTO
   * @param resourceWriter
   */
  public async saveResource(resourceSaveDTO: ResourceSaveDTO, resourceWriter: ResourceWriter): Promise<FileSaveResult> {
    const resourceId = resourceSaveDTO.id
    const fullSavePath = resourceSaveDTO.fullSavePath
    AssertNotNullish(resourceId, this.constructor.name, `保存作品资源失败，资源id不能为空`)
    AssertNotNullish(resourceSaveDTO.taskId, this.constructor.name, `保存作品资源失败，任务id不能为空`)
    AssertNotNullish(
      resourceSaveDTO.resourceStream,
      this.constructor.name,
      `保存作品资源失败，资源不能为空，taskId: ${resourceSaveDTO.taskId}`
    )
    AssertNotNullish(
      fullSavePath,
      this.constructor.name,
      `保存作品资源失败，资源的保存路径不能为空，workId: ${resourceSaveDTO.workId}`
    )

    if (NotNullish(resourceSaveDTO.resourceSize)) {
      resourceWriter.resourceSize = resourceSaveDTO.resourceSize
    } else {
      LogUtil.warn(this.constructor.name, `插件没有返回任务${resourceWriter}的资源的大小`)
      resourceWriter.resourceSize = 0
    }

    try {
      // 创建保存目录
      await CreateDirIfNotExists(path.dirname(fullSavePath))
      // 创建写入流
      const writeStream = fs.createWriteStream(fullSavePath)

      // 配置resourceWriter
      resourceWriter.readable = resourceSaveDTO.resourceStream
      resourceWriter.writable = writeStream
      resourceWriter.resource = new Resource(resourceSaveDTO)

      // 创建写入Promise
      const saveResult = await resourceWriter.doWrite()
      if (saveResult === FileSaveResult.FINISH) {
        await this.resourceFinished(resourceId)
      }
      // TODO 保存完成后比较一下原本存在数据库中的资源信息和保存用的资源信息
      return saveResult
    } catch (error) {
      fs.rm(fullSavePath, (error) => LogUtil.error(this.constructor.name, '删除因意外中断的资源文件失败，', error))
      const msg = `保存作品资源失败，taskId: ${resourceSaveDTO.taskId}`
      LogUtil.error(this.constructor.name, msg, error)
      throw error
    }
  }

  /**
   * 恢复保存资源
   * @param resourceSaveDTO
   * @param resourceWriter resourceWriter
   */
  public async resumeSaveResource(resourceSaveDTO: ResourceSaveDTO, resourceWriter: ResourceWriter): Promise<FileSaveResult> {
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

    const workdir = getSettings().get('workdir')
    const oldAbsolutePath = path.join(workdir, oldRes.filePath)

    const newFullSavePath = StringUtil.isBlank(resourceSaveDTO.fullSavePath) ? oldAbsolutePath : resourceSaveDTO.fullSavePath

    // 如果保存路径发生改变，移动到新路径
    if (oldAbsolutePath !== newFullSavePath) {
      let fileMoved = false
      try {
        await this.transaction(async () => {
          await rename(oldAbsolutePath, newFullSavePath)
          fileMoved = true
          // 更新资源信息
          await this.updateById(resourceSaveDTO)
        }, '恢复资源保存时移动原有资源文件到新路径下')
      } catch (error) {
        LogUtil.error(
          this.constructor.name,
          `保存作品资源失败，taskId: ${resourceSaveDTO.taskId}，恢复资源保存时移动原有资源文件到新路径下失败，尝试把文件移回原位`,
          error
        )
        if (fileMoved) {
          await rename(newFullSavePath, oldAbsolutePath)
        }
        throw error
      }
    }
    try {
      // 创建保存目录
      await CreateDirIfNotExists(path.dirname(newFullSavePath))
      // 创建写入流
      const writeable: fs.WriteStream = fs.createWriteStream(newFullSavePath, { flags: 'a' })
      writeable.bytesWritten = (await fs.promises.stat(newFullSavePath)).size

      // 配置resourceWriter
      resourceWriter.resourceSize = IsNullish(resourceSaveDTO.resourceSize) ? -1 : resourceSaveDTO.resourceSize
      resourceWriter.readable = resourceSaveDTO.resourceStream
      resourceWriter.writable = writeable
      resourceWriter.resource = new Resource(resourceSaveDTO)

      // 创建写入Promise
      const saveResult = await resourceWriter.doWrite()
      if (saveResult === FileSaveResult.FINISH) {
        await this.resourceFinished(resourceId)
      }
      // TODO 保存完成后比较一下原本存在数据库中的资源信息和保存用的资源信息
      return saveResult
    } catch (error) {
      fs.rm(newFullSavePath, (error) => LogUtil.error(this.constructor.name, '删除因意外中断的资源文件失败，', error))
      const msg = `保存作品资源失败，taskId: ${resourceSaveDTO.taskId}`
      LogUtil.error(this.constructor.name, msg, error)
      throw error
    }
  }

  /**
   * 替换资源
   * @param resourceSaveDTO
   * @param resourceWriter
   */
  public async replaceResource(resourceSaveDTO: ResourceSaveDTO, resourceWriter: ResourceWriter): Promise<FileSaveResult> {
    const resourceId = resourceSaveDTO.id
    const fullSavePath = resourceSaveDTO.fullSavePath
    AssertNotNullish(resourceId, this.constructor.name, `替换资源失败，资源id不能为空`)
    AssertNotNullish(
      resourceSaveDTO.resourceStream,
      this.constructor.name,
      `替换作品资源失败，资源不能为空，workId: ${resourceSaveDTO.workId}`
    )
    AssertNotNullish(
      fullSavePath,
      this.constructor.name,
      `替换作品资源失败，资源的保存路径不能为空，workId: ${resourceSaveDTO.workId}`
    )
    const oldResource = await this.getById(resourceId)
    AssertNotNullish(oldResource, this.constructor.name, `替换资源失败，资源不存在`)
    AssertNotBlank(
      oldResource.filePath,
      this.constructor.name,
      `替换作品资源失败，原作品资源的路径不能为空，workId: ${resourceSaveDTO.workId}`
    )

    if (NotNullish(resourceSaveDTO.resourceSize)) {
      resourceWriter.resourceSize = resourceSaveDTO.resourceSize
    } else {
      LogUtil.warn(this.constructor.name, `插件没有返回任务${resourceWriter}的资源的大小`)
      resourceWriter.resourceSize = 0
    }

    // 创建备份
    const workdir = getSettings().store.workdir
    const oldResAbsolutePath = path.join(workdir, oldResource.filePath)
    const backupService = new BackupService()
    const backupAbsolutePath = AddSuffix(oldResAbsolutePath, '-lsBackup')
    let backupPromise: Promise<Backup | undefined> | undefined
    try {
      // 先重命名文件再创建备份，避免原文件占用新的资源的名称
      await fs.promises.access(oldResAbsolutePath)
      await rename(oldResAbsolutePath, backupAbsolutePath)
      backupPromise = backupService
        .createBackup(BackupSourceTypeEnum.WORK, resourceId, backupAbsolutePath)
        .then((backup) => {
          rm(backupAbsolutePath)
          return backup
        })
        .catch((error) => {
          SendNotifyToWindow({ type: 'error', msg: `创建备份失败，原文件【${oldResAbsolutePath}】，${error.message}` })
          return undefined
        })
    } catch (error) {
      LogUtil.warn(this.constructor.name, '替换资源时未创建备份，因为原文件不存在，', error)
    }

    try {
      // 创建保存目录
      await CreateDirIfNotExists(path.dirname(fullSavePath))
      // 创建写入流
      const writeStream = fs.createWriteStream(fullSavePath)

      // 配置resourceWriter
      resourceWriter.readable = resourceSaveDTO.resourceStream
      resourceWriter.writable = writeStream
      resourceWriter.resource = new Resource(resourceSaveDTO)

      // 写入资源
      const tempResForUpdate = new Resource(resourceSaveDTO)
      tempResForUpdate.id = resourceId
      tempResForUpdate.resourceComplete = BOOL.FALSE
      await this.updateById(tempResForUpdate)
      const saveResult = await resourceWriter.doWrite()
      if (saveResult === FileSaveResult.FINISH) {
        await this.resourceFinished(resourceId)
      }
      return saveResult
    } catch (error) {
      fs.rm(fullSavePath, (error) => LogUtil.error(this.constructor.name, '删除因意外中断的资源文件失败，', error))
      const backup = await backupPromise
      let recovered = false
      if (NotNullish(backup)) {
        await backupService.recoverToPath(backup.id as number, oldResAbsolutePath, true).catch((recoverError) => {
          LogUtil.error(this.constructor.name, '恢复资源失败', recoverError)
        })
        recovered = true
      } else {
        LogUtil.error(this.constructor.name, '恢复资源失败，替换资源前没有创建备份')
      }
      const msg = `替换资源失败，taskId: ${resourceSaveDTO.taskId}，原文件${recovered ? '已恢复' : '未能恢复'}`
      LogUtil.error(this.constructor.name, msg, error)
      throw error
    }
  }

  /**
   * 新增启用的资源
   * @param resource
   */
  public async saveActive(resource: Resource): Promise<number> {
    AssertNotNullish(resource.workId, `资源设置为启用失败，workId不能为空`)
    resource.state = BOOL.TRUE
    const oldRes = await this.listByWorkId(resource.workId)
    if (ArrayNotEmpty(oldRes)) {
      oldRes.forEach((res) => (res.state = BOOL.FALSE))
      await this.updateBatchById(oldRes)
    }
    return this.save(resource)
  }

  /**
   * 资源设置为启用
   * @param id
   * @param workId
   */
  public async setActive(id: number, workId?: number): Promise<number> {
    let allRes: Resource[]
    if (IsNullish(workId)) {
      const target = await this.getById(id)
      AssertNotNullish(target, `资源设置为启用失败，资源id: ${id}不可用`)
      AssertNotNullish(target.workId, `资源设置为启用失败，workId不能为空`)
      allRes = await this.listByWorkId(target.workId)
    } else {
      allRes = await this.listByWorkId(workId)
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
   * @param workId
   */
  public clearInactiveByWorkId(workId: number): Promise<number> {
    const query = new ResourceQueryDTO()
    query.workId = workId
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
   * @param workId
   */
  public getActiveByWorkId(workId: number): Promise<Resource | undefined> {
    const query = new ResourceQueryDTO()
    query.workId = workId
    query.state = BOOL.TRUE
    return this.get(query)
  }

  /**
   * 查询作品id是否有启用的资源
   * @param workId
   */
  public hasActiveByWorkId(workId: number): Promise<boolean> {
    return this.dao.hasActiveByWorkId(workId)
  }

  /**
   * 根据作品id查询所有资源
   * @param workId 作品id
   */
  public listByWorkId(workId: number): Promise<Resource[]> {
    const query = new ResourceQueryDTO()
    query.workId = workId
    return this.list(query)
  }

  /**
   * 根据作品id查询所有资源
   * @param workIds 作品id列表
   */
  public listByWorkIds(workIds: number[]): Promise<Resource[]> {
    const query = new ResourceQueryDTO()
    query.workId = workIds
    query.operators = { workId: Operator.IN }
    return this.list(query)
  }

  /**
   * 创建资源文件名
   * @description 根据setting.workSettings.fileNameFormat给出的格式化字符串创建文件名
   * @param workFullInfo
   */
  public static createFileName(workFullInfo: WorkFullDTO): string {
    // TODO 还有一部分类型没有进行处理；对ResFileNameFormatEnum.AUTHOR的处理逻辑还有问题；作者级别的处理也有问题
    const fileNameFormat = getSettings().store.workSettings.fileNameFormat
    const getReplacement = (token: string): string => {
      switch (token) {
        case ResFileNameFormatEnum.AUTHOR.token:
          return this.getAuthorName(workFullInfo)
        case ResFileNameFormatEnum.LOCAL_AUTHOR_NAME.token:
          return this.getLocalAuthorName(workFullInfo)
        case ResFileNameFormatEnum.SITE_AUTHOR_NAME.token:
          return this.getSiteAuthorName(workFullInfo)
        case ResFileNameFormatEnum.SITE_AUTHOR_ID.token:
          return this.getSiteAuthorId(workFullInfo)
        case ResFileNameFormatEnum.SITE_WORK_ID.token:
          return IsNullish(workFullInfo.siteWorkId) ? 'invalidSiteWorkId' : workFullInfo.siteWorkId
        case ResFileNameFormatEnum.SITE_WORK_NAME.token:
          return IsNullish(workFullInfo.siteWorkName) ? 'invalidSiteWorkName' : workFullInfo.siteWorkName
        case ResFileNameFormatEnum.DESCRIPTION.token:
          return IsNullish(workFullInfo.siteWorkDescription) ? '' : workFullInfo.siteWorkDescription
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
   * @param workFullInfo
   * @private
   */
  private static getAuthorName(workFullInfo: WorkFullDTO): string {
    const mainLocalAuthors: RankedLocalAuthor[] = ArrayIsEmpty(workFullInfo.localAuthors)
      ? []
      : workFullInfo.localAuthors.filter((localAuthor) => localAuthor.authorRank === AuthorRank.RANK_0)
    const mainSiteAuthors: RankedSiteAuthor[] = ArrayIsEmpty(workFullInfo.siteAuthors)
      ? []
      : workFullInfo.siteAuthors.filter((siteAuthor) => siteAuthor.authorRank === AuthorRank.RANK_0)
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
   * @param workFullInfo
   * @private
   */
  private static getLocalAuthorName(workFullInfo: WorkFullDTO): string {
    const mainLocalAuthors: RankedLocalAuthor[] = ArrayIsEmpty(workFullInfo.localAuthors)
      ? []
      : workFullInfo.localAuthors.filter((localAuthor) => localAuthor.authorRank === AuthorRank.RANK_0)
    return ArrayIsEmpty(mainLocalAuthors)
      ? 'invalidAuthorName'
      : StringUtil.isBlank(mainLocalAuthors[0].authorName)
        ? ''
        : mainLocalAuthors[0].authorName
  }

  /**
   * 获取站点作者名称
   * @param workFullInfo
   * @private
   */
  private static getSiteAuthorName(workFullInfo: WorkFullDTO): string {
    const mainSiteAuthors: RankedSiteAuthor[] = ArrayIsEmpty(workFullInfo.siteAuthors)
      ? []
      : workFullInfo.siteAuthors.filter((siteAuthor) => siteAuthor.authorRank === AuthorRank.RANK_0)
    return ArrayIsEmpty(mainSiteAuthors)
      ? 'invalidAuthorName'
      : StringUtil.isBlank(mainSiteAuthors[0].authorName)
        ? ''
        : mainSiteAuthors[0].authorName
  }

  /**
   * 获取站点作者id
   * @param workFullInfo
   * @private
   */
  private static getSiteAuthorId(workFullInfo: WorkFullDTO): string {
    const mainSiteAuthors: RankedSiteAuthor[] = ArrayIsEmpty(workFullInfo.siteAuthors)
      ? []
      : workFullInfo.siteAuthors.filter((siteAuthor) => siteAuthor.authorRank === AuthorRank.RANK_0)
    return ArrayIsEmpty(mainSiteAuthors)
      ? 'invalidAuthorId'
      : StringUtil.isBlank(mainSiteAuthors[0].siteAuthorId)
        ? ''
        : mainSiteAuthors[0].siteAuthorId
  }

  /**
   * 获取资源的绝对路径
   * @param resourceId 资源id
   */
  public async getFullResourcePath(resourceId: number) {
    const res = await this.getById(resourceId)
    AssertNotNullish(res, this.constructor.name, `获取资源${resourceId}的绝对路径失败，资源id不可用`)
    AssertNotNullish(res.filePath, this.constructor.name, `获取资源${resourceId}的绝对路径失败，资源的路径不能为空`)
    const workdir = getSettings().store.workdir
    return path.join(workdir, res.filePath)
  }
}
