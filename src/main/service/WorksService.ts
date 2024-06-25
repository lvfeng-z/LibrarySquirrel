import PageModel from '../model/utilModels/PageModel.ts'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.ts'
import Works from '../model/Works.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import { WorksDao } from '../dao/WorksDao.ts'
import SettingsService from './SettingsService.ts'
import LogUtil from '../util/LogUtil.ts'
import fs from 'fs'
import { promisify } from 'node:util'
import { SAVE_FAILED } from '../constant/CrudConstant.ts'
import FileSysUtil from '../util/FileSysUtil.ts'
import path from 'path'
import BaseService from './BaseService.ts'
import BaseDao from '../dao/BaseDao.ts'
import SiteAuthorService from './SiteAuthorService.ts'
import SiteService from './SiteService.ts'
import LocalTagService from './LocalTagService.ts'

export default class WorksService extends BaseService<WorksQueryDTO, Works> {
  constructor() {
    super('WorksService')
  }

  /**
   * 保存作品信息及资源
   * @param worksDTO
   */
  async saveWorksAndResource(worksDTO: WorksDTO): Promise<number> {
    const dao = new WorksDao()
    // 读取设置中的工作目录信息
    const settings = SettingsService.getSettings() as { workdir: string }
    // 如果插件返回了任务资源，将资源保存至本地，否则发出警告
    if (
      Object.prototype.hasOwnProperty.call(worksDTO, 'resourceStream') &&
      worksDTO.resourceStream !== undefined &&
      worksDTO.resourceStream !== null
    ) {
      // 提取作品信息
      const works = new Works(worksDTO)
      // 作者信息
      const siteAuthorName: string = 'unknownAuthor'
      if (
        Object.prototype.hasOwnProperty.call(worksDTO, 'siteAuthor') &&
        worksDTO.siteAuthor !== undefined &&
        worksDTO.siteAuthor !== null
      ) {
        if (
          worksDTO.siteAuthor.siteAuthorName === undefined ||
          worksDTO.siteAuthor.siteAuthorName === null
        ) {
          LogUtil.warn(
            'WorksService',
            `保存任务时，作者名称为空，taskId: ${worksDTO.includeTaskId}未返回作者名称`
          )
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
      try {
        await FileSysUtil.createDirIfNotExists(fullSavePath)
        const writeStream = fs.createWriteStream(path.join(fullSavePath, fileName))
        await pipelinePromise(worksDTO.resourceStream, writeStream)
        works.filePath = path.join(relativeSavePath, fileName)
        works.workdir = settings.workdir
        const worksId = dao.save(works)
        return worksId as Promise<number>
      } catch (error) {
        LogUtil.error(
          'WorksService',
          `保存作品时出错，taskId: ${worksDTO.includeTaskId}，error: ${String(error)}`
        )
        return SAVE_FAILED
      }
    } else {
      LogUtil.error('WorksService', `保存作品时，资源意外为空，taskId: ${worksDTO.includeTaskId}`)
      return SAVE_FAILED
    }
  }

  /**
   * 保存作品信息
   * @param worksDTO
   */
  async saveWorks(worksDTO: WorksDTO): Promise<void> {
    const site = worksDTO.site
    const siteAuthorDTO = worksDTO.siteAuthor
    const localTags = worksDTO.localTags
    // 处理站点
    if (site !== undefined && site !== null) {
      const siteService = new SiteService()
      await siteService.saveOnNotExistByDomain(site)
    }
    // 处理站点作者
    if (siteAuthorDTO !== undefined && siteAuthorDTO !== null) {
      const siteAuthorService = new SiteAuthorService()
      await siteAuthorService.saveOrUpdateBySiteAuthorId(siteAuthorDTO)
    }
    // 处理本地标签
    if (localTags !== undefined && localTags != null && localTags.length > 0) {
      const localTagService = new LocalTagService()
      await localTagService.link(localTags, worksDTO)
    }

    // 保存作品获得作品Id
    // const dao = new WorksDao()
    // // const worksId = await dao.save(worksDTO)
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
      return dao.queryPage(page)
    } catch (error) {
      LogUtil.error('WorksService', error)
      throw error
    }
  }

  protected getDao(): BaseDao<WorksQueryDTO, Works> {
    return new WorksDao()
  }
}
