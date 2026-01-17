import BaseService from '../base/BaseService.ts'
import WorksSet from '../model/entity/WorksSet.ts'
import WorksSetQueryDTO from '../model/queryDTO/WorksSetQueryDTO.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import WorksSetDao from '../dao/WorksSetDao.ts'
import { AssertNotNullish } from '../util/AssertUtil.js'
import { IsNullish, NotNullish } from '../util/CommonUtil.js'
import WorksSetWithWorksDTO from '../model/dto/WorksSetWithWorksDTO.ts'
import { Operator } from '../constant/CrudConstant.ts'
import WorksService from './WorksService.ts'
import lodash from 'lodash'
import { Dictionary } from 'async'
import WorksSetWithWorksId from '../model/domain/WorksSetWithWorksId.ts'

/**
 * 作品集Service
 */
export default class WorksSetService extends BaseService<WorksSetQueryDTO, WorksSet, WorksSetDao> {
  constructor(db?: DatabaseClient) {
    super(WorksSetDao, db)
  }

  /**
   * 根据作品集在站点的id和入库任务的id查询作品集
   * @param siteWorksSetId 作品集在站点的id
   * @param taskId 入库任务的id
   */
  public async getBySiteWorksSetIdAndTaskId(siteWorksSetId: string, taskId: number): Promise<WorksSet | undefined> {
    return this.dao.getBySiteWorksSetIdAndTaskId(siteWorksSetId, taskId)
  }

  /**
   * 根据作品集在站点的id和入库任务的id查询作品集
   * @param siteWorksSetIds 作品集在站点的id
   */
  public async listBySiteWorksSetIds(siteWorksSetIds: string[]): Promise<WorksSet[]> {
    const query = new WorksSetQueryDTO()
    query.siteWorksSetId = siteWorksSetIds
    query.operators = { siteWorksSetId: Operator.IN }
    return this.list(query)
  }

  /**
   * 根据作品集id列表查询作品集及其对应的作品列表
   * @param ids 作品集id列表
   */
  public async listWorksSetWithWorksByIds(ids: number[]): Promise<WorksSetWithWorksDTO[]> {
    const query = new WorksSetQueryDTO()
    query.id = ids
    query.operators = { id: Operator.IN }
    // 查询作品集元数据
    const worksSetList = await this.list(query)
    // 查询作品集的作品
    const worksService = new WorksService()
    const worksSetIds: number[] = worksSetList.map((worksSet) => worksSet.id).filter(NotNullish)
    const worksWithWorksSetIdList = await worksService.listWorksWithWorkSetIdByWorksSetIds(worksSetIds)
    // 补全作品的作品信息
    const worksIds = worksWithWorksSetIdList.map((works) => works.id).filter(NotNullish)
    const fullWorksList = await worksService.listFullWorksInfoByIds(worksIds)
    // 作品放入作品集中
    const workIdToWorksSetIdMap = Object.fromEntries(
      worksWithWorksSetIdList
        .filter((item) => NotNullish(item.id) && NotNullish(item.worksSetId))
        .map((item) => [item.id, item.worksSetId])
    )
    const worksSetIdToWorksMap = lodash.groupBy(fullWorksList, (works) => {
      const worksId = works.id
      if (IsNullish(worksId)) {
        return
      } else {
        return workIdToWorksSetIdMap[worksId]
      }
    })
    return worksSetList.map((worksSet: WorksSet) => {
      const tempWorksSetId = worksSet.id
      const tempWorks = IsNullish(tempWorksSetId) ? [] : worksSetIdToWorksMap[tempWorksSetId]
      return new WorksSetWithWorksDTO(worksSet, tempWorks)
    })
  }

  /**
   * 根据作品集在站点的id保存或更新
   * @param worksSets
   */
  public async saveOrUpdateBatchBySiteWorksSetId(worksSets: WorksSet[]) {
    const siteWorksSetIds = worksSets.map((worksSet) => worksSet.siteWorksSetId) as string[]
    const oldWorksSets = await this.listBySiteWorksSetIds(siteWorksSetIds)
    const newWorksSets = worksSets.map((worksSet) => {
      AssertNotNullish(worksSet.siteAuthorId, this.constructor.name, '根据作品集在站点的id保存或更新失败，站点作者的id不能为空')
      AssertNotNullish(worksSet.siteId, this.constructor.name, '根据作品集在站点的id保存或更新失败，站点作者的站点id不能为空')
      const oldWorksSet = oldWorksSets.find((oldWorksSet) => oldWorksSet.siteWorksSetId === worksSet.siteWorksSetId)
      const newWorksSet = new WorksSet(worksSet)

      if (NotNullish(oldWorksSet)) {
        newWorksSet.id = oldWorksSet.id
      }
      return newWorksSet
    })
    return super.saveOrUpdateBatchById(newWorksSets, [['site_id', 'site_works_set_id']])
  }

  /**
   * 根据站点作品集查询
   * @param siteWorksSets
   */
  public async listBySiteWorksSet(siteWorksSets: { siteWorksSetId: string; siteId: number }[]): Promise<WorksSet[]> {
    return this.dao.listBySiteWorksSet(siteWorksSets)
  }

  /**
   * 根据作品id列表查询作品与作品集映射关系
   * @param worksIds 作品id列表
   */
  public async getWorksToWorksSetMapByWorksIds(worksIds: number[]): Promise<Dictionary<WorksSetWithWorksId[]>> {
    const worksSetWithWorksIdList = await this.dao.listWorksSetWithWorksIdByWorksIds(worksIds)
    return lodash.groupBy(worksSetWithWorksIdList, 'worksId')
  }
}
