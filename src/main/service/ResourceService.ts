import BaseService from '../base/BaseService.js'
import ResourceQueryDTO from '../model/queryDTO/ResourceQueryDTO.js'
import Resource from '../model/entity/Resource.js'
import ResourceDao from '../dao/ResourceDao.js'
import DB from '../database/DB.js'
import { AssertNotNullish } from '../util/AssertUtil.js'
import { BOOL } from '../constant/BOOL.js'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish } from '../util/CommonUtil.js'
import { GlobalVar, GlobalVars } from '../base/GlobalVar.js'
import StringUtil from '../util/StringUtil.js'
import LogUtil from '../util/LogUtil.js'
import { CreateDirIfNotExists, SanitizeFileName } from '../util/FileSysUtil.js'
import path from 'path'
import ResourceSaveDTO from '../model/dto/ResourceSaveDTO.js'
import { AuthorRank } from '../constant/AuthorRank.js'
import SiteAuthorRankDTO from '../model/dto/SiteAuthorRankDTO.js'
import LocalAuthorRankDTO from '../model/dto/LocalAuthorRankDTO.js'
import TaskWriter from '../util/TaskWriter.js'
import { FileSaveResult } from '../constant/FileSaveResult.js'
import fs from 'fs'
import WorksFullDTO from '../model/dto/WorksFullDTO.js'
import ResFileNameFormatEnum from '../constant/ResFileNameFormatEnum.js'

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
      LogUtil.error('WorksService', msg)
      throw new Error(msg)
    }
    const resource = worksFullDTO.resource
    AssertNotNullish(resource, `保存资源失败，资源信息不能为空，taskId: ${result.taskId}`)

    // 作者信息
    const localAuthors: LocalAuthorRoleDTO[] = ArrayIsEmpty(worksFullDTO.localAuthors) ? [] : worksFullDTO.localAuthors
    const siteAuthors: SiteAuthorRoleDTO[] = ArrayIsEmpty(worksFullDTO.siteAuthors) ? [] : worksFullDTO.siteAuthors
    const tempName = ResourceService.getAuthorName(siteAuthors, localAuthors)
    const authorName = tempName === undefined ? 'unknownAuthor' : tempName

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
    // 资源状态
    result.resourceComplete = BOOL.FALSE

    return result
  }

  /**
   * 保存资源
   * @param resourceSaveDTO
   * @param fileWriter
   */
  public async saveResource(resourceSaveDTO: ResourceSaveDTO, fileWriter: TaskWriter): Promise<FileSaveResult> {
    AssertNotNullish(resourceSaveDTO.taskId, this.constructor.name, `保存作品资源失败，任务id不能为空`)
    AssertNotNullish(
      resourceSaveDTO.resourceStream,
      this.constructor.name,
      `保存作品资源失败，资源不能为空，taskId: ${resourceSaveDTO.taskId}`
    )
    AssertNotNullish(
      resourceSaveDTO.fullSavePath,
      this.constructor.name,
      `保存作品资源失败，作品的fullSaveDir不能为空，worksId: ${resourceSaveDTO.id}`
    )
    const resId = resourceSaveDTO.id
    AssertNotNullish(resId, this.constructor.name, `保存作品资源失败，资源id不能为空`)

    try {
      // 创建保存目录
      await CreateDirIfNotExists(path.dirname(resourceSaveDTO.fullSavePath))
      // 创建写入流
      const writeStream = fs.createWriteStream(resourceSaveDTO.fullSavePath)

      // 创建写入Promise
      fileWriter.readable = resourceSaveDTO.resourceStream
      fileWriter.writable = writeStream
      fileWriter.resourceId = resId
      return fileWriter.doWrite()
    } catch (error) {
      const msg = `保存作品失败，taskId: ${resourceSaveDTO.taskId}`
      LogUtil.error('WorksService', msg, error)
      throw error
    }
  }

  /**
   * 恢复保存资源
   * @param fileWriter 任务writer
   */
  public static async resumeSaveResource(fileWriter: TaskWriter): Promise<FileSaveResult> {
    AssertNotNullish(fileWriter.readable, 'WorksService', `恢复资源下载时资源流不能为空`)
    AssertNotNullish(fileWriter.writable, 'WorksService', `恢复资源下载时写入流不能为空`)

    return fileWriter.doWrite()
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
   * 根据作品id查询所有资源
   * @param worksId
   */
  public listByWorksId(worksId: number): Promise<Resource[]> {
    const query = new ResourceQueryDTO()
    query.worksId = worksId
    return this.list(query)
  }

  /**
   * 从作品信息中提取用于文件名的作者名称
   * @param siteAuthors
   * @param localAuthors
   * @private
   */
  private static getAuthorName(siteAuthors: SiteAuthorRoleDTO[], localAuthors: LocalAuthorRoleDTO[]): string | undefined {
    let authorName: string | undefined
    // 优先使用站点作者名称
    if (siteAuthors !== undefined && siteAuthors !== null && siteAuthors.length > 0) {
      const mainAuthor = siteAuthors.filter((siteAuthor) => siteAuthor.authorRole === AuthorRole.MAIN)
      // 先查找主作者，没有主作者就查找平级作者
      if (mainAuthor.length > 0) {
        if (mainAuthor.length > 1) {
          LogUtil.warn('WorksService', `保存作品失败，作品包含了多个主要作者`)
        } else {
          authorName = mainAuthor[0].siteAuthorName as string
        }
      } else {
        const equalAuthor = siteAuthors.filter((siteAuthor) => siteAuthor.authorRole === AuthorRole.EQUAL)
        if (equalAuthor.length > 0) {
          authorName = equalAuthor[0].siteAuthorName as string
        } else {
          LogUtil.warn('WorksService', `保存作品失败，作者名称为空`)
        }
      }
    } else if (localAuthors !== undefined && localAuthors !== null && localAuthors.length > 0) {
      const mainAuthor = localAuthors.filter((localAuthor) => localAuthor.authorRole === AuthorRole.MAIN)
      // 先查找主作者，没有主作者就查找平级作者
      if (mainAuthor.length > 0) {
        if (mainAuthor.length > 1) {
          LogUtil.warn('WorksService', `保存作品失败，作品包含了多个主要作者`)
        } else {
          authorName = mainAuthor[0].localAuthorName as string
        }
      } else {
        const equalAuthor = localAuthors.filter((siteAuthor) => siteAuthor.authorRole === AuthorRole.EQUAL)
        if (equalAuthor.length > 0) {
          authorName = equalAuthor[0].localAuthorName as string
        } else {
          LogUtil.warn('WorksService', `保存作品失败，作者名称为空`)
        }
      }
    }
    return authorName
  }

  public static createFileName(worksFullInfo: WorksFullDTO): string {
    // TODO 还有一部分类型没有进行处理；对ResFileNameFormatEnum.AUTHOR的处理逻辑还有问题；作者角色的处理也有问题
    const fileNameFormat = (
      GlobalVar.get(GlobalVars.SETTINGS).get('worksSettings') as {
        fileNameFormat: string
      }
    ).fileNameFormat
    const getReplacement = (token: string): string => {
      switch (token) {
        case ResFileNameFormatEnum.AUTHOR.token: {
          const localAuthorName = this.getLocalAuthorName(worksFullInfo)
          if (StringUtil.isNotBlank(localAuthorName)) {
            return localAuthorName
          } else {
            return this.getSiteAuthorName(worksFullInfo)
          }
        }
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

  private static getLocalAuthorName(worksFullInfo: WorksFullDTO): string {
    const mainLocalAuthors: LocalAuthorRankDTO[] = ArrayIsEmpty(worksFullInfo.localAuthors)
      ? []
      : worksFullInfo.localAuthors.filter((localAuthor) => localAuthor.authorRank === AuthorRank.RANK_0)
    return ArrayIsEmpty(mainLocalAuthors)
      ? 'invalidAuthorName'
      : StringUtil.isBlank(mainLocalAuthors[0].localAuthorName)
        ? ''
        : mainLocalAuthors[0].localAuthorName
  }
  private static getSiteAuthorName(worksFullInfo: WorksFullDTO): string {
    const mainSiteAuthors: SiteAuthorRankDTO[] = ArrayIsEmpty(worksFullInfo.siteAuthors)
      ? []
      : worksFullInfo.siteAuthors.filter((siteAuthor) => siteAuthor.authorRank === AuthorRank.RANK_0)
    return ArrayIsEmpty(mainSiteAuthors)
      ? 'invalidAuthorName'
      : StringUtil.isBlank(mainSiteAuthors[0].siteAuthorName)
        ? ''
        : mainSiteAuthors[0].siteAuthorName
  }
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
