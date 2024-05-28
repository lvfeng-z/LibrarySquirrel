import PageModel from '../model/utilModels/PageModel.ts'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.ts'
import Works from '../model/Works.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import { WorksDao } from '../dao/WorksDao.ts'
import SettingsService from './SettingsService.ts'
import ApiUtil from '../util/ApiUtil.ts'
import LogUtil from '../util/LogUtil.ts'
import fs from 'fs'
import { promisify } from 'node:util'
import CrudConstant from '../constant/CrudConstant.ts'

/**
 * 保存作品信息及资源
 */
async function saveWorksAndResource(worksDTO: WorksDTO): Promise<number> {
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
    const siteAuthorName: string = 'unknown'
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
    const siteWorksName = worksDTO.siteWorksName === undefined ? 'unknown' : worksDTO.siteWorksName

    const pipelinePromise = promisify((readable: fs.ReadStream, writable: fs.WriteStream) =>
      readable.pipe(writable)
    )

    const writeStream = fs.createWriteStream(
      `${settings.workdir}/download/[${siteAuthorName}_${siteWorksName}]`
    )

    try {
      await pipelinePromise(worksDTO.resourceStream, writeStream)
      return dao.save(works).then((worksId) => worksId as number)
    } catch (error) {
      LogUtil.error(
        'WorksService',
        `保存作品时出错，taskId: ${worksDTO.includeTaskId}，error: ${String(error)}`
      )
      return CrudConstant.saveFailed
    }
  } else {
    LogUtil.error('WorksService', `保存作品时，资源意外为空，taskId: ${worksDTO.includeTaskId}`)
    return CrudConstant.saveFailed
  }
}

/**
 * 根据标签等信息分页查询作品
 * @param page 查询参数
 */
async function queryPage(page: PageModel<WorksQueryDTO, WorksDTO>): Promise<ApiUtil> {
  page = new PageModel(page)
  const dao = new WorksDao()
  try {
    await dao.queryPage(page)
    return ApiUtil.response(page)
  } catch (error) {
    return ApiUtil.error(String(error))
  }
}

export default {
  saveWorksAndResource,
  queryPage
}
