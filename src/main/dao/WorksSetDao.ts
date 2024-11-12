import BaseDao from './BaseDao.ts'
import WorksSetQueryDTO from '../model/queryDTO/WorksSetQueryDTO.ts'
import WorksSet from '../model/WorksSet.ts'
import DB from '../database/DB.ts'
import LogUtil from '../util/LogUtil.ts'
import { toObjAcceptedBySqlite3 } from '../util/DatabaseUtil.ts'
import { notNullish } from '../util/CommonUtil.ts'

export default class WorksSetDao extends BaseDao<WorksSetQueryDTO, WorksSet> {
  constructor(db?: DB) {
    super('works_set', 'WorksSetDao', db)
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
    const queryDTO = new WorksSetQueryDTO()
    queryDTO.siteWorksSetId = siteWorksSetId
    queryDTO.includeTaskId = taskId
    const whereClauseAndQuery = super.getWhereClause(queryDTO)
    const whereClause = whereClauseAndQuery.whereClause
    let modifiedQuery
    if (notNullish(whereClauseAndQuery.query)) {
      modifiedQuery = toObjAcceptedBySqlite3(whereClauseAndQuery.query)
    }
    const statement = `select *
                       from works_set ${whereClause}`
    const db = super.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, modifiedQuery)
      .then((rows) => {
        const result = super.getResultTypeDataList(rows) as WorksSet[]
        if (result.length > 1) {
          LogUtil.warn(
            'WorksSetDao',
            `同一站点作品集id和导入任务id下，存在多个作品集，siteWorksSetId: ${siteWorksSetId}，taskId: ${taskId}`
          )
        }
        if (result.length > 0) {
          return result[0]
        } else {
          return undefined
        }
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
