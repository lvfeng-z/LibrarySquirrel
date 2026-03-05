import BaseService from '../base/BaseService.ts'
import WorkSet from '@shared/model/entity/WorkSet.ts'
import WorkSetQueryDTO from '@shared/model/queryDTO/WorkSetQueryDTO.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import WorkSetDao from '../dao/WorkSetDao.ts'
import { assertNotNullish } from '@shared/util/AssertUtil.ts'
import { isNullish, notNullish, arrayNotEmpty } from '@shared/util/CommonUtil.ts'
import WorkSetWithWorkDTO from '@shared/model/dto/WorkSetWithWorkDTO.ts'
import { Operator } from '../constant/CrudConstant.ts'
import WorkService from './WorkService.ts'
import lodash from 'lodash'
import { Dictionary } from 'async'
import WorkSetWithWorkId from '@shared/model/domain/WorkSetWithWorkId.ts'
import SiteService from './SiteService.ts'
import PluginWorkSetDTO from '@shared/model/dto/PluginWorkSetDTO.ts'
import Page from '@shared/model/util/Page.ts'
import WorkSetCoverDTO from '@shared/model/dto/WorkSetCoverDTO.ts'
import { SearchCondition } from '@shared/model/util/SearchCondition.js'

/**
 * 作品集Service
 */
export default class WorkSetService extends BaseService<WorkSetQueryDTO, WorkSet, WorkSetDao> {
  constructor(db?: DatabaseClient) {
    super(WorkSetDao, db)
  }

  /**
   * 根据作品集在站点的id和入库任务的id查询作品集
   * @param siteWorkSetId 作品集在站点的id
   * @param taskId 入库任务的id
   */
  public async getBySiteWorkSetIdAndTaskId(siteWorkSetId: string, taskId: number): Promise<WorkSet | undefined> {
    return this.dao.getBySiteWorkSetIdAndTaskId(siteWorkSetId, taskId)
  }

  /**
   * 根据作品集在站点的id和站点名称查询作品集
   * @param siteWorkSetId 作品集在站点的id
   * @param siteName 入库任务的id
   */
  public async getBySiteWorkSetIdAndSiteName(siteWorkSetId: string, siteName: string): Promise<WorkSet | undefined> {
    return this.dao.getBySiteWorkSetIdAndSiteName(siteWorkSetId, siteName)
  }

  /**
   * 根据作品集在站点的id和入库任务的id查询作品集
   * @param siteWorkSetIds 作品集在站点的id
   */
  public async listBySiteWorkSetIds(siteWorkSetIds: string[]): Promise<WorkSet[]> {
    const query = new WorkSetQueryDTO()
    query.siteWorkSetId = siteWorkSetIds
    query.operators = { siteWorkSetId: Operator.IN }
    return this.list(query)
  }

  /**
   * 根据作品集id列表查询作品集及其对应的作品列表
   * @param ids 作品集id列表
   */
  public async listWorkSetWithWorkByIds(ids: number[]): Promise<WorkSetWithWorkDTO[]> {
    const query = new WorkSetQueryDTO()
    query.id = ids
    query.operators = { id: Operator.IN }
    // 查询作品集元数据
    const workSetList = await this.list(query)
    // 查询作品集的作品
    const workService = new WorkService()
    const workSetIds: number[] = workSetList.map((workSet) => workSet.id).filter(notNullish)
    const workWithWorkSetIdList = await workService.listWorkWithWorkSetIdByWorkSetIds(workSetIds)
    // 补全作品的作品信息
    const workIds = workWithWorkSetIdList.map((work) => work.id).filter(notNullish)
    const fullWorkList = await workService.listFullWorkInfoByIds(workIds)
    // 作品放入作品集中（保持 sort_order 顺序）
    const workIdToWorkSetIdMap = Object.fromEntries(
      workWithWorkSetIdList
        .filter((item) => notNullish(item.id) && notNullish(item.workSetId))
        .map((item) => [item.id, item.workSetId])
    )
    // 创建 workId 到 sortOrder 的映射
    const workIdToSortOrderMap = new Map(workWithWorkSetIdList.map((item) => [item.id, item.sortOrder ?? 0]))
    // 根据 sort_order 排序 fullWorkList
    const sortedFullWorkList = [...fullWorkList].sort((a, b) => {
      const sortOrderA = workIdToSortOrderMap.get(a.id ?? -1) ?? 0
      const sortOrderB = workIdToSortOrderMap.get(b.id ?? -1) ?? 0
      return sortOrderA - sortOrderB
    })
    const workSetIdToWorkMap = lodash.groupBy(sortedFullWorkList, (work) => {
      const workId = work.id
      if (isNullish(workId)) {
        return
      } else {
        return workIdToWorkSetIdMap[workId]
      }
    })
    return workSetList.map((workSet: WorkSet) => {
      const tempWorkSetId = workSet.id
      const tempWorkList = isNullish(tempWorkSetId) ? [] : workSetIdToWorkMap[tempWorkSetId]
      return new WorkSetWithWorkDTO(workSet, tempWorkList)
    })
  }

  /**
   * 根据作品集在站点的id保存或更新
   * @param workSets
   */
  public async saveOrUpdateBatchBySiteWorkSetId(workSets: WorkSet[]) {
    const siteWorkSetIds = workSets.map((workSet) => workSet.siteWorkSetId) as string[]
    const oldWorkSets = await this.listBySiteWorkSetIds(siteWorkSetIds)
    const newWorkSets = workSets.map((workSet) => {
      assertNotNullish(workSet.siteAuthorId, '根据作品集在站点的id保存或更新失败，作品集的id不能为空')
      assertNotNullish(workSet.siteId, '根据作品集在站点的id保存或更新失败，作品集的站点id不能为空')
      const oldWorkSet = oldWorkSets.find((tempOldWorkSet) => tempOldWorkSet.siteWorkSetId === workSet.siteWorkSetId)
      const newWorkSet = new WorkSet(workSet)

      if (notNullish(oldWorkSet)) {
        newWorkSet.id = oldWorkSet.id
      }
      return newWorkSet
    })
    return super.saveOrUpdateBatchById(newWorkSets, [['site_id', 'site_work_set_id']])
  }

  /**
   * 根据站点作品集查询
   * @param siteWorkSets
   */
  public async listBySiteWorkSet(siteWorkSets: { siteWorkSetId: string; siteId: number }[]): Promise<WorkSet[]> {
    return this.dao.listBySiteWorkSet(siteWorkSets)
  }

  /**
   * 根据作品id列表查询作品与作品集映射关系
   * @param workIds 作品id列表
   */
  public async getWorkToWorkSetMapByWorkIds(workIds: number[]): Promise<Dictionary<WorkSetWithWorkId[]>> {
    const workSetWithWorkIdList = await this.dao.listWorkSetWithWorkIdByWorkIds(workIds)
    return lodash.groupBy(workSetWithWorkIdList, 'workId')
  }

  /**
   * 生成用于保存的作品集信息
   */
  public static async createSaveInfosFromPlugin(pluginWorkSetDTOS: PluginWorkSetDTO[]) {
    const result: WorkSet[] = []
    // 用于查询和缓存站点id
    const siteService = new SiteService()
    const sites = await siteService.listByNames(
      pluginWorkSetDTOS.map((pluginWorkSetDTO) => pluginWorkSetDTO.siteName).filter(notNullish)
    )
    const siteNameToSiteMap = lodash.keyBy(sites, 'siteName')
    for (const pluginWorkSetDTO of pluginWorkSetDTOS) {
      if (isNullish(pluginWorkSetDTO.siteName)) {
        result.push(new WorkSet(pluginWorkSetDTO.workSet))
        continue
      }
      const tempSite = siteNameToSiteMap[pluginWorkSetDTO.siteName]
      const tempWorkSet = new WorkSet(pluginWorkSetDTO.workSet)
      if (notNullish(tempSite)) {
        tempWorkSet.siteId = tempSite.id
      }
      result.push(tempWorkSet)
    }
    return result
  }

  /**
   * 根据作品id查询作品集列表
   * @param workId 作品id
   */
  public async listByWorkId(workId: number): Promise<WorkSet[]> {
    return this.dao.listByWorkId(workId)
  }

  /**
   * 分页查询作品集（包含封面）
   * @param page 分页查询参数
   */
  public async queryPageWithCover(page: Page<WorkSetQueryDTO, WorkSet>): Promise<Page<WorkSetQueryDTO, WorkSetCoverDTO>> {
    // 查询作品集分页列表
    const resultPage = await this.dao.queryPageWithCover(page)

    // 获取作品集id列表
    const workSetIds = resultPage.data?.map((workSet) => workSet.id).filter(notNullish) as number[]

    // 查询封面资源
    const coverResourceMap = await this.dao.listCoverResourceByWorkSetIds(workSetIds)

    // 组合作品集和封面
    const workSetCoverList =
      resultPage.data?.map((workSet) => {
        const workSetId = workSet.id
        const coverResource = workSetId ? coverResourceMap.get(workSetId) : undefined
        return new WorkSetCoverDTO(workSet, coverResource)
      }) ?? []

    // 转换结果
    const coverPage = resultPage.transform<WorkSetCoverDTO>()
    coverPage.data = workSetCoverList

    return coverPage
  }

  /**
   * 根据作品搜索条件分页查询作品集（包含封面）
   * 当作品集中的任意作品符合条件时，将这个作品集放入结果集中
   * @param page 分页查询参数
   * @param searchConditions 作品搜索条件
   */
  public async queryPageByWorkConditionsWithCover(
    page: Page<WorkSetQueryDTO, WorkSet>,
    searchConditions: SearchCondition[]
  ): Promise<Page<WorkSetQueryDTO, WorkSetCoverDTO>> {
    // 查询作品集基础信息
    const resultPage = await this.dao.queryPageByWorkConditions(page, searchConditions)

    // 获取作品集id列表
    const workSetIds = resultPage.data?.map((workSet) => workSet.id).filter(notNullish) as number[]

    // 如果没有作品集，直接返回空结果
    if (!arrayNotEmpty(workSetIds)) {
      const emptyPage = resultPage.transform<WorkSetCoverDTO>()
      emptyPage.data = []
      return emptyPage
    }

    // 批量查询封面资源
    const coverResourceMap = await this.dao.listCoverResourceByWorkSetIds(workSetIds)

    // 组合作品集和封面
    const workSetCoverList =
      resultPage.data?.map((workSet) => {
        const workSetId = workSet.id
        const coverResource = workSetId ? coverResourceMap.get(workSetId) : undefined
        return new WorkSetCoverDTO(workSet, coverResource)
      }) ?? []

    // 转换结果
    const coverPage = resultPage.transform<WorkSetCoverDTO>()
    coverPage.data = workSetCoverList

    return coverPage
  }
}
