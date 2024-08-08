import PageModel from '../model/utilModels/PageModel.ts'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.ts'
import Works from '../model/Works.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import { WorksDao } from '../dao/WorksDao.ts'
import SettingsService from './SettingsService.ts'
import LogUtil from '../util/LogUtil.ts'
import fs from 'fs'
import { promisify } from 'node:util'
import FileSysUtil from '../util/FileSysUtil.ts'
import path from 'path'
import BaseService from './BaseService.ts'
import SiteAuthorService from './SiteAuthorService.ts'
import SiteService from './SiteService.ts'
import LocalTagService from './LocalTagService.ts'
import DB from '../database/DB.ts'
import SiteTagService from './SiteTagService.ts'
import LocalAuthorService from './LocalAuthorService.ts'
import { ReadStream } from 'node:fs'
import { AuthorRole } from '../constant/AuthorRole.ts'
import TaskService from './TaskService.ts'
import { isNullish, notNullish } from '../util/CommonUtil.ts'
import WorksSetService from './WorksSetService.ts'
import WorksSet from '../model/WorksSet.ts'
import { Limit } from 'p-limit'

export default class WorksService extends BaseService<WorksQueryDTO, Works, WorksDao> {
  constructor(db?: DB) {
    super('WorksService', new WorksDao(db), db)
  }

  /**
   * 保存作品资源
   * @param worksDTO
   * @param limit 保存线程并发限制
   */
  async saveWorksResource(worksDTO: WorksDTO, limit?: Limit): Promise<unknown> {
    // 读取设置中的工作目录信息
    const settings = SettingsService.getSettings() as { workdir: string }
    // 如果插件返回了任务资源，将资源保存至本地，否则发出警告
    if (
      Object.prototype.hasOwnProperty.call(worksDTO, 'resourceStream') &&
      worksDTO.resourceStream !== undefined &&
      worksDTO.resourceStream !== null
    ) {
      // 处理作者信息
      const tempName = this.getAuthorNameFromAuthorDTO(worksDTO)
      const authorName = tempName === undefined ? 'unknownAuthor' : tempName

      // 作品信息
      const siteWorksName =
        worksDTO.siteWorksName === undefined ? 'unknownWorksName' : worksDTO.siteWorksName

      // 保存路径
      const fileName = `${authorName}_${siteWorksName}_${Math.random()}${worksDTO.filenameExtension}`
      const relativeSavePath = path.join('/includeDir', authorName)
      const fullSavePath = path.join(settings.workdir, relativeSavePath)

      const pipelinePromise = promisify(
        (readable: fs.ReadStream, writable: fs.WriteStream, callback) => {
          let errorOccurred = false

          readable.on('error', (err) => {
            errorOccurred = true
            LogUtil.error('WorksService', `readable出错${err}`)
            callback(err)
          })

          writable.on('error', (err) => {
            errorOccurred = true
            LogUtil.error('WorksService', `writable出错${err}`)
            callback(err)
          })

          readable.on('end', () => {
            if (!errorOccurred) {
              writable.end()
              callback(null)
            }
          })
          readable.pipe(writable)
        }
      )

      // 保存资源和作品信息
      try {
        // 创建保存目录
        await FileSysUtil.createDirIfNotExists(fullSavePath)
        // 创建写入流
        const writeStream = fs.createWriteStream(path.join(fullSavePath, fileName))
        // 数据写入量追踪器
        const bytesWrittenTracker = {
          writeStream: writeStream,
          bytesSum: isNullish(worksDTO.resourceSize) ? 0 : worksDTO.resourceSize
        }
        // 创建写入Promise
        let saveResourcePromise: Promise<unknown>
        if (isNullish(limit)) {
          saveResourcePromise = pipelinePromise(worksDTO.resourceStream as ReadStream, writeStream)
        } else {
          saveResourcePromise = limit(() =>
            pipelinePromise(worksDTO.resourceStream as ReadStream, writeStream)
          )
        }
        // 创建任务监听器
        const taskService = new TaskService()
        if (isNullish(worksDTO.includeTaskId)) {
          const msg = '创建任务监听器时，任务id意外为空'
          LogUtil.warn('WorksService', msg)
        } else {
          taskService.addTaskTracker(
            String(worksDTO.includeTaskId),
            bytesWrittenTracker,
            saveResourcePromise
          )
        }

        return saveResourcePromise
      } catch (error) {
        const msg = `保存作品时出错，taskId: ${worksDTO.includeTaskId}，error: ${String(error)}`
        LogUtil.error('WorksService', msg)
        throw new Error(msg)
      }
    } else {
      const msg = `保存作品时，资源意外为空，taskId: ${worksDTO.includeTaskId}`
      LogUtil.error('WorksService', msg)
      throw new Error(msg)
    }
  }

  /**
   * 保存作品信息
   * @param worksDTO
   */
  async saveWorksInfo(worksDTO: WorksDTO): Promise<number> {
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
      const worksId = await db.nestedTransaction(async (transactionDB) => {
        try {
          // 如果worksSets不为空，则此作品是作品集中的作品
          if (notNullish(worksDTO.worksSets) && worksDTO.worksSets.length > 0) {
            // 遍历处理作品集数组
            for (const worksSet of worksDTO.worksSets) {
              if (notNullish(worksSet) && notNullish(worksDTO.includeTaskId)) {
                const taskService = new TaskService(transactionDB)
                const includeTask = await taskService.getById(worksDTO.includeTaskId)
                const rootTaskId = includeTask.parentId
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
            const localTagService = new LocalTagService(transactionDB)
            await localTagService.link(localTags, worksDTO)
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
        } catch (error) {
          LogUtil.warn('WorksService', '保存作品时出错')
          throw error
        }
      }, 'saveWorks')

      return worksId as Promise<number>
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  /**
   * 根据标签等信息分页查询作品
   * @param page 查询参数
   */
  async queryPage(
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
          const relationShipMap = await localAuthorService.getWorksAuthorRelationShip(worksIds)
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
