import PageModel from '../model/utilModels/PageModel.ts'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.ts'
import Works from '../model/Works.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import { WorksDao } from '../dao/WorksDao.ts'
import SettingsService from './SettingsService.ts'
import LogUtil from '../util/LogUtil.ts'
import fs from 'fs'
import { createDirIfNotExists, pipelineReadWrite } from '../util/FileSysUtil.ts'
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
import { isNullish, notNullish } from '../util/CommonUtil.ts'
import WorksSetService from './WorksSetService.ts'
import WorksSet from '../model/WorksSet.ts'
import StringUtil from '../util/StringUtil.ts'
import { TaskTracker } from '../model/utilModels/TaskTracker.ts'
import WorksPluginDTO from '../model/dto/WorksPluginDTO.ts'
import WorksSaveDTO from '../model/dto/WorksSaveDTO.ts'
import { ReWorksTagService } from './ReWorksTagService.js'
import { TaskStatesEnum } from '../constant/TaskStatesEnum.js'
import { Readable, Writable } from 'node:stream'
import { assertNotNullish } from '../util/AssertUtil.js'
import { FileSaveResult } from '../constant/FileSaveResult.js'

export default class WorksService extends BaseService<WorksQueryDTO, Works, WorksDao> {
  constructor(db?: DB) {
    super('WorksService', new WorksDao(db), db)
  }

  /**
   * 生成保存作品用的信息
   * @param worksDTO 插件返回的作品DTO
   */
  public generateWorksSaveInfo(worksDTO: WorksPluginDTO): WorksSaveDTO {
    const result = new WorksSaveDTO(worksDTO)
    // 读取设置中的工作目录信息
    const settings = SettingsService.getSettings() as { workdir: string }
    const workdir = settings.workdir
    if (StringUtil.isBlank(workdir)) {
      const msg = `保存资源时，工作目录意外为空，taskId: ${result.includeTaskId}`
      LogUtil.error('WorksService', msg)
      throw new Error(msg)
    }
    try {
      // 处理作者信息
      const tempName = this.getAuthorNameFromAuthorDTO(result)
      const authorName = tempName === undefined ? 'unknownAuthor' : tempName

      // 作品信息
      const siteWorksName =
        result.siteWorksName === undefined ? 'unknownWorksName' : result.siteWorksName

      // 资源状态
      result.resourceComplete = false

      // 保存路径
      const fileName = `${authorName}_${siteWorksName}_${Math.random()}${result.filenameExtension}`
      const relativeSavePath = path.join('/includeDir', authorName)
      result.fileName = fileName
      result.fullSaveDir = path.join(workdir, relativeSavePath)
      result.filePath = path.join(relativeSavePath, fileName)
      result.workdir = workdir

      return result
    } catch (error) {
      const msg = `保存作品时出错，taskId: ${worksDTO.includeTaskId}，error: ${String(error)}`
      LogUtil.error('WorksService', msg)
      throw error
    }
  }

  /**
   * 保存作品资源
   * @param worksDTO
   * @param taskTracker
   */
  public async saveWorksResource(
    worksDTO: WorksSaveDTO,
    taskTracker: TaskTracker
  ): Promise<TaskStatesEnum> {
    assertNotNullish(
      worksDTO.resourceStream,
      'WorksService',
      `保存作品时，资源意外为空，taskId: ${worksDTO.includeTaskId}`
    )
    // 保存资源的过程
    const writeStreamPromise = (readable: Readable, writeable: Writable): Promise<FileSaveResult> =>
      pipelineReadWrite(readable, writeable)
    // 保存资源
    // 创建保存目录
    assertNotNullish(
      worksDTO.fullSaveDir,
      'WorksService',
      `保存作品资源时，作品的fullSaveDir意外为空，worksId: ${worksDTO.id}`
    )
    assertNotNullish(
      worksDTO.fileName,
      'WorksService',
      `保存作品资源时，作品的fileName意外为空，worksId: ${worksDTO.id}`
    )

    try {
      await createDirIfNotExists(worksDTO.fullSaveDir)
      // 创建写入流
      const fullPath = path.join(worksDTO.fullSaveDir, worksDTO.fileName)
      const writeStream = fs.createWriteStream(fullPath)
      taskTracker.writeStream = writeStream
      // 创建写入Promise
      const saveResourceFinishPromise: Promise<FileSaveResult> = writeStreamPromise(
        worksDTO.resourceStream,
        writeStream
      )

      return saveResourceFinishPromise.then((saveResult) => {
        if (FileSaveResult.FINISH === saveResult) {
          return TaskStatesEnum.FINISHED
        } else {
          return TaskStatesEnum.PAUSE
        }
      })
    } catch (error) {
      const msg = `保存作品时出错，taskId: ${worksDTO.includeTaskId}，error: ${String(error)}`
      LogUtil.error('WorksService', msg)
      throw error
    }
  }

  /**
   * 恢复保存作品资源
   * @param taskTracker 任务追踪器
   */
  public async resumeSaveWorksResource(taskTracker: TaskTracker): Promise<TaskStatesEnum> {
    const writeStreamPromise = (readable: Readable, writeable: Writable): Promise<FileSaveResult> =>
      pipelineReadWrite(readable, writeable)
    assertNotNullish(taskTracker.readStream, 'WorksService', `恢复资源下载时资源流意外为空`)
    assertNotNullish(taskTracker.writeStream, 'WorksService', `恢复资源下载时写入流意外为空`)
    return writeStreamPromise(taskTracker.readStream, taskTracker.writeStream).then(
      (saveResult) => {
        if (FileSaveResult.FINISH === saveResult) {
          return TaskStatesEnum.FINISHED
        } else {
          return TaskStatesEnum.PAUSE
        }
      }
    )
  }

  /**
   * 保存作品信息
   * @param worksDTO
   */
  public async saveWorksInfo(worksDTO: WorksDTO): Promise<number> {
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
          if (notNullish(worksDTO.worksSets) && worksDTO.worksSets.length > 0) {
            // 遍历处理作品集数组
            for (const worksSet of worksDTO.worksSets) {
              if (notNullish(worksSet) && notNullish(worksDTO.includeTaskId)) {
                const taskService = new TaskService(transactionDB)
                const includeTask = await taskService.getById(worksDTO.includeTaskId)
                if (isNullish(includeTask)) {
                  const msg = '修改本地标签时，原标签信息意外为空'
                  LogUtil.error('LocalTagService', msg)
                  throw new Error(msg)
                }
                const rootTaskId = includeTask.pid
                const siteWorksSetId = worksSet.siteWorksSetId

                if (notNullish(siteWorksSetId) && notNullish(rootTaskId)) {
                  const worksSetService = new WorksSetService(transactionDB)
                  const oldWorksSet = await worksSetService.getBySiteWorksSetIdAndTaskId(
                    siteWorksSetId,
                    rootTaskId
                  )
                  if (isNullish(oldWorksSet)) {
                    const tempWorksSet = new WorksSet(worksSet)
                    tempWorksSet.includeTaskId = rootTaskId
                    await worksSetService.save(tempWorksSet)
                    worksSetService.link([worksDTO], tempWorksSet)
                  } else {
                    worksSetService.link([worksDTO], oldWorksSet)
                  }
                } else {
                  LogUtil.warn(
                    'WorksService',
                    `保存作品时，所属作品集的信息不可用，siteWorksName: ${worksDTO.siteWorksName}`
                  )
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

          // 关联作品和本地作者
          if (notNullish(localAuthors) && localAuthors.length > 0) {
            const localAuthorService = new LocalAuthorService(transactionDB)
            await localAuthorService.link(localAuthors, worksDTO)
          }
          // 关联作品和本地标签
          if (localTags !== undefined && localTags != null && localTags.length > 0) {
            const localTagIds = localTags
              .map((localTag) => localTag.id)
              .filter((localTagId) => notNullish(localTagId))
            const reWorksTagService = new ReWorksTagService(transactionDB)
            await reWorksTagService.link(localTagIds, worksDTO.id)
          }
          // 关联作品和站点作者
          if (siteAuthors !== undefined && siteAuthors != null && siteAuthors.length > 0) {
            const siteAuthorService = new SiteAuthorService(transactionDB)
            await siteAuthorService.link(siteAuthors, worksDTO)
          }
          // 关联作品和站点标签
          if (siteTags !== undefined && siteTags != null && siteTags.length > 0) {
            const siteTagService = new SiteTagService(transactionDB)
            await siteTagService.link(siteTags, worksDTO)
          }

          return worksDTO.id
        }, `保存作品信息，taskId: ${worksDTO.includeTaskId}`)
        .catch((error) => {
          LogUtil.warn('WorksService', '保存作品时出错')
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
  public async queryPage(
    page: PageModel<WorksQueryDTO, WorksDTO>
  ): Promise<PageModel<WorksQueryDTO, Works>> {
    page = new PageModel(page)
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
    if (
      worksDTO.siteAuthors !== undefined &&
      worksDTO.siteAuthors !== null &&
      worksDTO.siteAuthors.length > 0
    ) {
      const mainAuthor = worksDTO.siteAuthors.filter(
        (siteAuthor) => siteAuthor.authorRole === AuthorRole.MAIN
      )
      // 先查找主作者，没有主作者就查找平级作者
      if (mainAuthor.length > 0) {
        if (mainAuthor.length > 1) {
          LogUtil.warn(
            'WorksService',
            `保存作品时，作品包含了多个主要作者，taskId: ${worksDTO.includeTaskId}`
          )
        } else {
          authorName = mainAuthor[0].siteAuthorName as string
        }
      } else {
        const equalAuthor = worksDTO.siteAuthors.filter(
          (siteAuthor) => siteAuthor.authorRole === AuthorRole.EQUAL
        )
        if (equalAuthor.length > 0) {
          authorName = equalAuthor[0].siteAuthorName as string
        } else {
          LogUtil.warn(
            'WorksService',
            `保存作品时，作者名称为空，taskId: ${worksDTO.includeTaskId}未返回有效的作者信息`
          )
        }
      }
    } else if (
      worksDTO.localAuthors !== undefined &&
      worksDTO.localAuthors !== null &&
      worksDTO.localAuthors.length > 0
    ) {
      const mainAuthor = worksDTO.localAuthors.filter(
        (localAuthor) => localAuthor.authorRole === AuthorRole.MAIN
      )
      // 先查找主作者，没有主作者就查找平级作者
      if (mainAuthor.length > 0) {
        if (mainAuthor.length > 1) {
          LogUtil.warn(
            'WorksService',
            `保存作品时，作品包含了多个主要作者，taskId: ${worksDTO.includeTaskId}`
          )
        } else {
          authorName = mainAuthor[0].localAuthorName as string
        }
      } else {
        const equalAuthor = worksDTO.localAuthors.filter(
          (siteAuthor) => siteAuthor.authorRole === AuthorRole.EQUAL
        )
        if (equalAuthor.length > 0) {
          authorName = equalAuthor[0].localAuthorName as string
        } else {
          LogUtil.warn(
            'WorksService',
            `保存作品时，作者名称为空，taskId: ${worksDTO.includeTaskId}未返回有效的作者信息`
          )
        }
      }
    }
    return authorName
  }
}
