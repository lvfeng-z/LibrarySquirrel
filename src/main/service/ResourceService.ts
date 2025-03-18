import BaseService from '../base/BaseService.js'
import ResourceQueryDTO from '../model/queryDTO/ResourceQueryDTO.js'
import Resource from '../model/entity/Resource.js'
import ResourceDao from '../dao/ResourceDao.js'
import DB from '../database/DB.js'
import { AssertNotNullish } from '../util/AssertUtil.js'
import { OnOff } from '../constant/OnOff.js'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish } from '../util/CommonUtil.js'
import { GlobalVar, GlobalVars } from '../base/GlobalVar.js'
import StringUtil from '../util/StringUtil.js'
import LogUtil from '../util/LogUtil.js'
import { CreateDirIfNotExists, SanitizeFileName } from '../util/FileSysUtil.js'
import path from 'path'
import ResourceSaveDTO from '../model/dto/ResourceSaveDTO.js'
import { AuthorRole } from '../constant/AuthorRole.js'
import SiteAuthorDTO from '../model/dto/SiteAuthorDTO.js'
import LocalAuthorDTO from '../model/dto/LocalAuthorDTO.js'
import TaskWriter from '../util/TaskWriter.js'
import { FileSaveResult } from '../constant/FileSaveResult.js'
import fs from 'fs'
import WorksDTO from '../model/dto/WorksDTO.js'

/**
 * 资源服务
 */
export default class ResourceService extends BaseService<ResourceQueryDTO, Resource, ResourceDao> {
  constructor(db?: DB) {
    super(ResourceDao, db)
  }

  /**
   * 创建用于保存资源的资源信息
   * @param worksDTO
   */
  public static async createSaveInfo(worksDTO: WorksDTO): Promise<ResourceSaveDTO> {
    const result = new ResourceSaveDTO()
    // 读取设置中的工作目录信息
    const workdir = GlobalVar.get(GlobalVars.SETTINGS).store.workdir
    if (StringUtil.isBlank(workdir)) {
      const msg = `保存资源失败，工作目录不能为空，taskId: ${result.taskId}`
      LogUtil.error('WorksService', msg)
      throw new Error(msg)
    }
    const resource = worksDTO.resource
    AssertNotNullish(resource, `保存资源失败，资源信息不能为空，taskId: ${result.taskId}`)

    // 作者信息
    const localAuthors: LocalAuthorDTO[] = ArrayIsEmpty(worksDTO.localAuthors) ? [] : worksDTO.localAuthors
    const siteAuthors: SiteAuthorDTO[] = ArrayIsEmpty(worksDTO.siteAuthors) ? [] : worksDTO.siteAuthors
    const tempName = ResourceService.getAuthorName(siteAuthors, localAuthors)
    const authorName = tempName === undefined ? 'unknownAuthor' : tempName
    // 作品信息
    const siteWorksName = worksDTO.siteWorksName === undefined ? 'unknownWorksName' : worksDTO.siteWorksName
    result.filenameExtension = worksDTO.resource?.filenameExtension

    // 保存路径
    const standardAuthorName = SanitizeFileName(authorName)
    const finalAuthorName = StringUtil.isBlank(standardAuthorName) ? 'InvalidAuthorName' : standardAuthorName

    const fileName = `${finalAuthorName}_${siteWorksName}_${Math.random()}${result.filenameExtension}`
    const standardFileName = SanitizeFileName(fileName)
    const finalFileName = StringUtil.isBlank(standardFileName) ? 'noname' : standardFileName

    const relativeSavePath = path.join('/includeDir', finalAuthorName)

    // 资源
    result.fileName = finalFileName
    result.fullSavePath = path.join(workdir, relativeSavePath, finalFileName)
    result.filePath = path.join(relativeSavePath, fileName)
    result.workdir = workdir
    result.importMethod = resource.importMethod
    result.suggestedName = resource.suggestedName
    // 资源状态
    result.resourceComplete = 0

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

    try {
      const resService = new ResourceService()
      await resService.saveActive(resourceSaveDTO)
      // 创建保存目录
      await CreateDirIfNotExists(path.dirname(resourceSaveDTO.fullSavePath))
      // 创建写入流
      const writeStream = fs.createWriteStream(resourceSaveDTO.fullSavePath)

      // 创建写入Promise
      fileWriter.readable = resourceSaveDTO.resourceStream
      fileWriter.writable = writeStream
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
    resource.state = OnOff.ON
    const allRes = await this.listByWorksId(resource.worksId)
    if (ArrayNotEmpty(allRes)) {
      allRes.forEach((res) => (res.state = OnOff.OFF))
      allRes.push(resource)
      return this.saveOrUpdateBatchById(allRes)
    } else {
      return this.save(resource)
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
        res.state = OnOff.ON
      } else {
        res.state = OnOff.OFF
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
    query.state = OnOff.OFF
    return this.delete(query)
  }

  /**
   * 资源状态改为已完成
   * @param id 作品id
   */
  public async resourceFinished(id: number): Promise<number> {
    const resource = new Resource()
    resource.id = id
    resource.resourceComplete = 1
    return this.updateById(resource)
  }

  /**
   * 根据作品id查询启用的资源
   * @param worksId
   */
  public getActiveByWorksId(worksId: number): Promise<Resource | undefined> {
    const query = new ResourceQueryDTO()
    query.worksId = worksId
    query.state = OnOff.ON
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
  private static getAuthorName(siteAuthors: SiteAuthorDTO[], localAuthors: LocalAuthorDTO[]): string | undefined {
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
}
