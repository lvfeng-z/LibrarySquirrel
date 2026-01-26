import BaseService from '../base/BaseService.ts'
import WorkSet from '../model/entity/WorkSet.ts'
import WorkSetQueryDTO from '../model/queryDTO/WorkSetQueryDTO.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import WorkSetDao from '../dao/WorkSetDao.ts'
import { AssertNotNullish } from '../util/AssertUtil.js'
import { IsNullish, NotNullish } from '../util/CommonUtil.js'
import WorkSetWithWorkDTO from '../model/dto/WorkSetWithWorkDTO.ts'
import { Operator } from '../constant/CrudConstant.ts'
import WorkService from './WorkService.ts'
import lodash from 'lodash'
import { Dictionary } from 'async'
import WorkSetWithWorkId from '../model/domain/WorkSetWithWorkId.ts'

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
    const workSetIds: number[] = workSetList.map((workSet) => workSet.id).filter(NotNullish)
    const workWithWorkSetIdList = await workService.listWorkWithWorkSetIdByWorkSetIds(workSetIds)
    // 补全作品的作品信息
    const workIds = workWithWorkSetIdList.map((work) => work.id).filter(NotNullish)
    const fullWorkList = await workService.listFullWorkInfoByIds(workIds)
    // 作品放入作品集中
    const workIdToWorkSetIdMap = Object.fromEntries(
      workWithWorkSetIdList
        .filter((item) => NotNullish(item.id) && NotNullish(item.workSetId))
        .map((item) => [item.id, item.workSetId])
    )
    const workSetIdToWorkMap = lodash.groupBy(fullWorkList, (work) => {
      const workId = work.id
      if (IsNullish(workId)) {
        return
      } else {
        return workIdToWorkSetIdMap[workId]
      }
    })
    return workSetList.map((workSet: WorkSet) => {
      const tempWorkSetId = workSet.id
      const tempWorkList = IsNullish(tempWorkSetId) ? [] : workSetIdToWorkMap[tempWorkSetId]
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
      AssertNotNullish(workSet.siteAuthorId, this.constructor.name, '根据作品集在站点的id保存或更新失败，站点作者的id不能为空')
      AssertNotNullish(workSet.siteId, this.constructor.name, '根据作品集在站点的id保存或更新失败，站点作者的站点id不能为空')
      const oldWorkSet = oldWorkSets.find((tempOldWorkSet) => tempOldWorkSet.siteWorkSetId === workSet.siteWorkSetId)
      const newWorkSet = new WorkSet(workSet)

      if (NotNullish(oldWorkSet)) {
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
}
