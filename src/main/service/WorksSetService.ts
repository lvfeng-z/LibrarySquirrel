import BaseService from './BaseService.ts'
import WorksSet from '../model/WorksSet.ts'
import WorksSetQueryDTO from '../model/queryDTO/WorksSetQueryDTO.ts'
import DB from '../database/DB.ts'
import WorksSetDao from '../dao/WorksSetDao.ts'

/**
 * 作品集Service
 */
export default class WorksSetService extends BaseService<WorksSetQueryDTO, WorksSet, WorksSetDao> {
  constructor(db?: DB) {
    super('WorksSetService', new WorksSetDao(db), db)
  }

  /**
   * 根据作品集在站点的id和入库任务的id查询作品集
   * @param siteWorksSetId 作品集在站点的id
   * @param taskId 入库任务的id
   */
  public async getBySiteWorksSetIdAndTaskId(
    siteWorksSetId: string,
    taskId: number
  ): Promise<WorksSet | undefined> {
    return this.dao.getBySiteWorksSetIdAndTaskId(siteWorksSetId, taskId)
  }
}
