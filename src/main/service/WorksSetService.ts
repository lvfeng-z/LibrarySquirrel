import BaseService from '../base/BaseService.ts'
import WorksSet from '../model/entity/WorksSet.ts'
import WorksSetQueryDTO from '../model/queryDTO/WorksSetQueryDTO.ts'
import DB from '../database/DB.ts'
import WorksSetDao from '../dao/WorksSetDao.ts'
import { AssertNotNullish } from '../util/AssertUtil.js'
import { NotNullish } from '../util/CommonUtil.js'

/**
 * 作品集Service
 */
export default class WorksSetService extends BaseService<WorksSetQueryDTO, WorksSet, WorksSetDao> {
  constructor(db?: DB) {
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
    return this.list(query)
  }

  /**
   * 根据作品集在站点的id保存或更新
   * @param worksSets
   */
  public async saveOrUpdateBatchBySiteWorksSetId(worksSets: WorksSet[]) {
    const siteWorksSetIds = worksSets.map((worksSet) => worksSet.siteWorksSetId) as string[]
    const oldWorksSets = await this.listBySiteWorksSetIds(siteWorksSetIds)
    const newWorksSets = worksSets.map((worksSet) => {
      AssertNotNullish(worksSet.siteAuthorId, this.constructor.name, '根据作品集在站点的id保存或更新失败，站点作者的id意外为空')
      AssertNotNullish(worksSet.siteId, this.constructor.name, '根据作品集在站点的id保存或更新失败，站点作者的站点id意外为空')
      const oldWorksSet = oldWorksSets.find((oldWorksSet) => oldWorksSet.siteWorksSetId === worksSet.siteWorksSetId)
      const newWorksSet = new WorksSet(worksSet)

      if (NotNullish(oldWorksSet)) {
        newWorksSet.id = oldWorksSet.id
      }
      return newWorksSet
    })
    return super.saveOrUpdateBatchById(newWorksSets)
  }

  /**
   * 根据站点作品集查询
   * @param siteWorksSets
   */
  public async listBySiteWorksSet(siteWorksSets: { siteWorksSetId: string; siteId: number }[]): Promise<WorksSet[]> {
    return this.dao.listBySiteWorksSet(siteWorksSets)
  }
}
