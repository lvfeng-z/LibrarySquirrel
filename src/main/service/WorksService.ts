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

export default class WorksService extends BaseService<WorksQueryDTO, Works> {
  constructor(db?: DB) {
    super('WorksService', new WorksDao(), db)
  }

  /**
   * 保存作品信息及资源
   * @param worksDTO
   */
  async saveWorksAndResource(worksDTO: WorksDTO): Promise<number> {
    // 读取设置中的工作目录信息
    const settings = SettingsService.getSettings() as { workdir: string }
    // 如果插件返回了任务资源，将资源保存至本地，否则发出警告
    if (
      Object.prototype.hasOwnProperty.call(worksDTO, 'resourceStream') &&
      worksDTO.resourceStream !== undefined &&
      worksDTO.resourceStream !== null
    ) {
      // 处理作者信息
      let siteAuthorName: string = 'unknownAuthor'
      if (
        worksDTO.siteAuthors !== undefined &&
        worksDTO.siteAuthors !== null &&
        worksDTO.siteAuthors.length > 0
      ) {
        const target = worksDTO.siteAuthors.filter(
          (siteAuthor) => siteAuthor.authorRole === AuthorRole.MAIN
        )
        if (target.length === 0) {
          LogUtil.warn(
            'WorksService',
            `保存作品时，作者名称为空，taskId: ${worksDTO.includeTaskId}未返回有效的作者信息`
          )
        } else if (target.length > 1) {
          LogUtil.warn(
            'WorksService',
            `保存作品时，作品包含了多个主要作者，taskId: ${worksDTO.includeTaskId}未返回有效的作者信息`
          )
        } else {
          siteAuthorName = target[0].siteAuthorName as string
        }
      } else if (
        worksDTO.localAuthors !== undefined &&
        worksDTO.localAuthors !== null &&
        worksDTO.localAuthors.length > 0
      ) {
        const target = worksDTO.localAuthors.filter(
          (localAuthor) => localAuthor.authorRole === AuthorRole.MAIN
        )
        if (target.length === 0) {
          LogUtil.warn(
            'WorksService',
            `保存作品时，作者名称为空，taskId: ${worksDTO.includeTaskId}未返回有效的作者信息`
          )
        } else if (target.length > 1) {
          LogUtil.warn(
            'WorksService',
            `保存作品时，作品包含了多个主要作者，taskId: ${worksDTO.includeTaskId}未返回有效的作者信息`
          )
        } else {
          siteAuthorName = target[0].localAuthorName as string
        }
      }

      // 作品信息
      const siteWorksName =
        worksDTO.siteWorksName === undefined ? 'unknownWorksName' : worksDTO.siteWorksName

      // 保存路径
      const fileName = `${siteAuthorName}_${siteWorksName}_${Math.random()}${worksDTO.filenameExtension}`
      const relativeSavePath = path.join(siteAuthorName)
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
      // 开启事务
      let db: DB
      if (this.injectedDB) {
        db = this.db as DB
      } else {
        db = new DB('WorksService')
      }
      try {
        const result = await db.nestedTransaction(async (transactionDB) => {
          try {
            await FileSysUtil.createDirIfNotExists(fullSavePath)
            const writeStream = fs.createWriteStream(path.join(fullSavePath, fileName))
            await pipelinePromise(worksDTO.resourceStream as ReadStream, writeStream)
            worksDTO.filePath = path.join(relativeSavePath, fileName)
            worksDTO.workdir = settings.workdir

            // 创建一个新的服务对象用于组合嵌套事务
            const worksService = new WorksService(transactionDB)
            const worksId = worksService.saveWorks(worksDTO)
            return worksId as Promise<number>
          } catch (error) {
            const msg = `保存作品时出错，taskId: ${worksDTO.includeTaskId}，error: ${String(error)}`
            LogUtil.error('WorksService', msg)
            throw new Error(msg)
          }
        })
        return result as Promise<number>
      } finally {
        if (!this.injectedDB) {
          db.release()
        }
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
  async saveWorks(worksDTO: WorksDTO): Promise<number> {
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
          // 保存站点
          if (site !== undefined && site !== null) {
            const siteService = new SiteService(transactionDB)
            await siteService.saveOnNotExistByDomain(site)
          }
          // 保存站点作者
          if (siteAuthors !== undefined && siteAuthors !== null) {
            const siteAuthorService = new SiteAuthorService(transactionDB)
            await siteAuthorService.saveOrUpdateBatchBySiteAuthorId(siteAuthors)
          }
          // 保存站点标签
          if (siteTags !== undefined && siteTags !== null && siteTags.length > 0) {
            const siteTagService = new SiteTagService(transactionDB)
            await siteTagService.saveOrUpdateBatchBySiteTagId(siteTags)
          }

          // 保存作品
          const dao = new WorksDao(transactionDB)
          const works = new Works(worksDTO)
          worksDTO.id = await dao.save(works)

          // 关联作品和本地作者
          if (localAuthors !== undefined && localAuthors !== null && localAuthors.length > 0) {
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
      })

      return worksId as Promise<number>
    } finally {
      db.release()
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
    const dao = new WorksDao()
    try {
      return dao.synthesisQueryPage(page)
    } catch (error) {
      LogUtil.error('WorksService', error)
      throw error
    }
  }
}
