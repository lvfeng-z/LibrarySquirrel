import Page from '../model/util/Page.ts'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.ts'
import Works from '../model/entity/Works.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import { WorksDao } from '../dao/WorksDao.ts'
import LogUtil from '../util/LogUtil.ts'
import fs from 'fs'
import { createDirIfNotExists } from '../util/FileSysUtil.ts'
import path from 'path'
import BaseService from './BaseService.ts'
import SiteAuthorService from './SiteAuthorService.ts'
import SiteService from './SiteService.ts'
import LocalTagService from './LocalTagService.ts'
import DB from '../database/DB.ts'
import SiteTagService from './SiteTagService.ts'
import LocalAuthorService from './LocalAuthorService.ts'
import { AuthorRole } from '../constant/AuthorRole.ts'
import TaskService from './TaskService.ts'
import { arrayNotEmpty, isNullish, notNullish } from '../util/CommonUtil.ts'
import WorksSetService from './WorksSetService.ts'
import WorksSet from '../model/entity/WorksSet.ts'
import StringUtil from '../util/StringUtil.ts'
import WorksPluginDTO from '../model/dto/WorksPluginDTO.ts'
import WorksSaveDTO from '../model/dto/WorksSaveDTO.ts'
import { ReWorksTagService } from './ReWorksTagService.js'
import { assertNotNullish } from '../util/AssertUtil.js'
import { FileSaveResult } from '../constant/FileSaveResult.js'
import TaskWriter from '../util/TaskWriter.js'
import { SearchCondition } from '../model/util/SearchCondition.js'
import { GlobalVar, GlobalVars } from '../global/GlobalVar.js'

export default class WorksService extends BaseService<WorksQueryDTO, Works, WorksDao> {
  constructor(db?: DB) {
    super('WorksService', new WorksDao(db), db)
  }

  /**
   * 生成保存作品用的信息
   * @param worksDTO 插件返回的作品DTO
   * @param refreshMode 刷新模式（为true时，不会生成新的保存路径相关的属性）
   */
  public generateWorksSaveInfo(worksDTO: WorksPluginDTO, refreshMode?: boolean): WorksSaveDTO {
    const result = new WorksSaveDTO(worksDTO)
    // 读取设置中的工作目录信息
    const workdir = GlobalVar.get(GlobalVars.SETTINGS).store.workdir
    if (StringUtil.isBlank(workdir)) {
      const msg = `保存资源时，工作目录意外为空，taskId: ${result.taskId}`
      LogUtil.error('WorksService', msg)
      throw new Error(msg)
    }
    try {
      // 处理作者信息
      const tempName = this.getAuthorNameFromAuthorDTO(result)
      const authorName = tempName === undefined ? 'unknownAuthor' : tempName

      // 作品信息
      const siteWorksName = result.siteWorksName === undefined ? 'unknownWorksName' : result.siteWorksName

      // 资源状态
      result.resourceComplete = false

      // 保存路径
      if (!refreshMode) {
        const fileName = `${authorName}_${siteWorksName}_${Math.random()}${result.filenameExtension}`
        const relativeSavePath = path.join('/includeDir', authorName)
        result.fileName = fileName
        result.fullSavePath = path.join(workdir, relativeSavePath, fileName)
        result.filePath = path.join(relativeSavePath, fileName)
        result.workdir = workdir
      }

      return result
    } catch (error) {
      const msg = `保存作品时出错，taskId: ${worksDTO.taskId}`
      LogUtil.error('WorksService', msg, error)
      throw error
    }
  }

  /**
   * 保存作品资源
   * @param worksDTO
   * @param fileWriter
   */
  public static async saveWorksResource(worksDTO: WorksSaveDTO, fileWriter: TaskWriter): Promise<FileSaveResult> {
    assertNotNullish(worksDTO.resourceStream, 'WorksService', `保存作品时，资源意外为空，taskId: ${worksDTO.taskId}`)
    assertNotNullish(worksDTO.fullSavePath, 'WorksService', `保存作品资源时，作品的fullSaveDir意外为空，worksId: ${worksDTO.id}`)

    try {
      // 创建保存目录
      await createDirIfNotExists(path.dirname(worksDTO.fullSavePath))
      // 创建写入流
      const writeStream = fs.createWriteStream(worksDTO.fullSavePath)

      // 创建写入Promise
      fileWriter.readable = worksDTO.resourceStream
      fileWriter.writable = writeStream
      return fileWriter.doWrite()
    } catch (error) {
      const msg = `保存作品时出错，taskId: ${worksDTO.taskId}`
      LogUtil.error('WorksService', msg, error)
      throw error
    }
  }

  /**
   * 恢复保存作品资源
   * @param fileWriter 任务writer
   */
  public static async resumeSaveWorksResource(fileWriter: TaskWriter): Promise<FileSaveResult> {
    assertNotNullish(fileWriter.readable, 'WorksService', `恢复资源下载时资源流意外为空`)
    assertNotNullish(fileWriter.writable, 'WorksService', `恢复资源下载时写入流意外为空`)

    return fileWriter.doWrite()
  }

  /**
   * 保存作品信息
   * @param worksDTO
   */
  public async saveWorksInfo(worksDTO: WorksDTO): Promise<number> {
    const worksSets = worksDTO.worksSets
    const site = worksDTO.site
    const siteAuthors = worksDTO.siteAuthors
    const siteTags = worksDTO.siteTags
    const localAuthors = worksDTO.localAuthors
    const localTags = worksDTO.localTags

    // 开启事务
    let db: DB
    if (this.injectedDB) {
      db = this.db as DB
    } else {
      db = new DB('WorksService')
    }
    try {
      return db
        .transaction(async (transactionDB): Promise<number> => {
          // 如果worksSets不为空，则此作品是作品集中的作品
          let worksSetId: number = 0
          if (notNullish(worksDTO.worksSets) && worksDTO.worksSets.length > 0) {
            // 遍历处理作品集数组
            for (const worksSet of worksDTO.worksSets) {
              if (notNullish(worksSet) && notNullish(worksDTO.taskId)) {
                const taskService = new TaskService(transactionDB)
                const includeTask = await taskService.getById(worksDTO.taskId)
                assertNotNullish(includeTask, this.className, '修改作品集时，任务id意外为空')
                const rootTaskId = includeTask.pid
                const siteWorksSetId = worksSet.siteWorksSetId

                if (notNullish(siteWorksSetId) && notNullish(rootTaskId)) {
                  const worksSetService = new WorksSetService(transactionDB)
                  const oldWorksSet = await worksSetService.getBySiteWorksSetIdAndTaskId(siteWorksSetId, rootTaskId)
                  if (isNullish(oldWorksSet)) {
                    const tempWorksSet = new WorksSet(worksSet)
                    worksSetId = await worksSetService.save(tempWorksSet)
                  } else if (notNullish(oldWorksSet?.id)) {
                    worksSetId = oldWorksSet.id
                  }
                } else {
                  LogUtil.warn('WorksService', `保存作品时，所属作品集的信息不可用，siteWorksName: ${worksDTO.siteWorksName}`)
                }
              }
            }
          }
          // 保存站点
          if (notNullish(site)) {
            const siteService = new SiteService(transactionDB)
            await siteService.saveOnNotExistByDomain(site)
          }
          // 保存站点作者
          if (notNullish(siteAuthors)) {
            const siteAuthorService = new SiteAuthorService(transactionDB)
            await siteAuthorService.saveOrUpdateBatchBySiteAuthorId(siteAuthors)
          }
          // 保存站点标签
          if (notNullish(siteTags) && siteTags.length > 0) {
            const siteTagService = new SiteTagService(transactionDB)
            await siteTagService.saveOrUpdateBatchBySiteTagId(siteTags)
          }

          // 保存作品
          const works = new Works(worksDTO)
          const worksService = new WorksService(transactionDB)
          worksDTO.id = (await worksService.save(works)) as number

          // 关联作品和作品集
          if (arrayNotEmpty(worksSets)) {
            const worksSetService = new WorksSetService(transactionDB)
            for (const workSet of worksSets) {
              assertNotNullish(worksDTO.taskId, this.className, `关联作品和作品集时，作品id意外为空，taskId: ${worksDTO.taskId}`)
              assertNotNullish(
                workSet.siteWorksSetId,
                this.className,
                `关联作品和作品集时，作品集站点id意外为空，taskId: ${worksDTO.taskId}`
              )
              await worksSetService.link([worksDTO], worksSetId)
            }
          }
          // 关联作品和本地作者
          if (arrayNotEmpty(localAuthors)) {
            const localAuthorService = new LocalAuthorService(transactionDB)
            await localAuthorService.link(localAuthors, worksDTO)
          }
          // 关联作品和本地标签
          if (arrayNotEmpty(localTags)) {
            const localTagIds = localTags.map((localTag) => localTag.id).filter((localTagId) => notNullish(localTagId))
            const reWorksTagService = new ReWorksTagService(transactionDB)
            await reWorksTagService.link(localTagIds, worksDTO.id)
          }
          // 关联作品和站点作者
          if (arrayNotEmpty(siteAuthors)) {
            const siteAuthorService = new SiteAuthorService(transactionDB)
            await siteAuthorService.link(siteAuthors, worksDTO)
          }
          // 关联作品和站点标签
          if (arrayNotEmpty(siteTags)) {
            const siteTagService = new SiteTagService(transactionDB)
            await siteTagService.link(siteTags, worksDTO)
          }

          return worksDTO.id
        }, `保存作品信息，taskId: ${worksDTO.taskId}`)
        .catch((error) => {
          LogUtil.error('WorksService', '保存作品时出错')
          throw error
        })
        .finally(() => {
          if (!this.injectedDB) {
            db.release()
          }
        })
        .then()
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  /**
   * 作品的资源状态改为已完成
   * @param worksId 作品id
   */
  public async resourceFinished(worksId: number): Promise<number> {
    const works = new Works()
    works.id = worksId
    works.resourceComplete = true
    return this.updateById(works)
  }

  /**
   * 根据标签等信息分页查询作品
   * @param page 查询参数
   */
  public async queryPage(page: Page<WorksQueryDTO, WorksDTO>): Promise<Page<WorksQueryDTO, Works>> {
    page = new Page(page)
    try {
      // 查询作品信息
      const resultPage = await this.dao.synthesisQueryPage(page)

      // 给每个作品附加作者信息
      if (notNullish(resultPage.data)) {
        const worksIds = resultPage.data.map((worksDTO) => worksDTO.id) as number[]
        if (worksIds.length > 0) {
          const localAuthorService = new LocalAuthorService()
          const relationShipMap = await localAuthorService.listReWorksAuthor(worksIds)
          resultPage.data.forEach((worksDTO) => {
            worksDTO.localAuthors = relationShipMap.get(worksDTO.id as number)
          })
        }
      }
      return resultPage
    } catch (error) {
      LogUtil.error('WorksService', error)
      throw error
    }
  }

  /**
   * 多条件分页查询作品
   * @param page
   * @param query
   */
  public async multipleConditionQueryPage(
    page: Page<WorksQueryDTO, WorksDTO>,
    query: SearchCondition[]
  ): Promise<Page<WorksQueryDTO, Works>> {
    page = new Page(page)
    try {
      // 查询作品信息
      const resultPage = await this.dao.multipleConditionQueryPage(page, query)

      // 给每个作品附加作者信息
      if (notNullish(resultPage.data)) {
        const worksIds = resultPage.data.map((worksDTO) => worksDTO.id) as number[]
        if (worksIds.length > 0) {
          const localAuthorService = new LocalAuthorService()
          const relationShipMap = await localAuthorService.listReWorksAuthor(worksIds)
          resultPage.data.forEach((worksDTO) => {
            worksDTO.localAuthors = relationShipMap.get(worksDTO.id as number)
          })
        }
      }
      return resultPage
    } catch (error) {
      LogUtil.error('WorksService', error)
      throw error
    }
  }

  /**
   * 查询作品的完整信息
   * @param worksId 作品id
   */
  public async getFullWorksInfoById(worksId: number): Promise<WorksDTO | undefined> {
    const baseWorksInfo = await super.getById(worksId)
    const worksDTO = new WorksDTO(baseWorksInfo)

    // 本地作者
    const localAuthorService = new LocalAuthorService()
    worksDTO.localAuthors = await localAuthorService.listByWorksId(worksId)

    // 本地标签
    const localTagService = new LocalTagService()
    worksDTO.localTags = await localTagService.listByWorksId(worksId)

    // 站点信息
    const siteService = new SiteService()
    if (notNullish(worksDTO.siteId)) {
      worksDTO.site = await siteService.getById(worksDTO.siteId)
    }

    return worksDTO
  }

  /**
   * 从作品信息中提取用于文件名的作者名称
   * @param worksDTO
   * @private
   */
  private getAuthorNameFromAuthorDTO(worksDTO: WorksDTO): string | undefined {
    let authorName: string | undefined
    // 优先使用站点作者名称
    if (worksDTO.siteAuthors !== undefined && worksDTO.siteAuthors !== null && worksDTO.siteAuthors.length > 0) {
      const mainAuthor = worksDTO.siteAuthors.filter((siteAuthor) => siteAuthor.authorRole === AuthorRole.MAIN)
      // 先查找主作者，没有主作者就查找平级作者
      if (mainAuthor.length > 0) {
        if (mainAuthor.length > 1) {
          LogUtil.warn('WorksService', `保存作品时，作品包含了多个主要作者，taskId: ${worksDTO.taskId}`)
        } else {
          authorName = mainAuthor[0].siteAuthorName as string
        }
      } else {
        const equalAuthor = worksDTO.siteAuthors.filter((siteAuthor) => siteAuthor.authorRole === AuthorRole.EQUAL)
        if (equalAuthor.length > 0) {
          authorName = equalAuthor[0].siteAuthorName as string
        } else {
          LogUtil.warn('WorksService', `保存作品时，作者名称为空，taskId: ${worksDTO.taskId}未返回有效的作者信息`)
        }
      }
    } else if (worksDTO.localAuthors !== undefined && worksDTO.localAuthors !== null && worksDTO.localAuthors.length > 0) {
      const mainAuthor = worksDTO.localAuthors.filter((localAuthor) => localAuthor.authorRole === AuthorRole.MAIN)
      // 先查找主作者，没有主作者就查找平级作者
      if (mainAuthor.length > 0) {
        if (mainAuthor.length > 1) {
          LogUtil.warn('WorksService', `保存作品时，作品包含了多个主要作者，taskId: ${worksDTO.taskId}`)
        } else {
          authorName = mainAuthor[0].localAuthorName as string
        }
      } else {
        const equalAuthor = worksDTO.localAuthors.filter((siteAuthor) => siteAuthor.authorRole === AuthorRole.EQUAL)
        if (equalAuthor.length > 0) {
          authorName = equalAuthor[0].localAuthorName as string
        } else {
          LogUtil.warn('WorksService', `保存作品时，作者名称为空，taskId: ${worksDTO.taskId}未返回有效的作者信息`)
        }
      }
    }
    return authorName
  }
}
