import BaseDao from './BaseDao.ts'
import WorksSetQueryDTO from '../model/queryDTO/WorksSetQueryDTO.ts'
import WorksSet from '../model/entity/WorksSet.ts'
import DB from '../database/DB.ts'
import LogUtil from '../util/LogUtil.ts'
import { NotNullish } from '../util/CommonUtil.ts'

export default class WorksSetDao extends BaseDao<WorksSetQueryDTO, WorksSet> {
  constructor(db?: DB) {
    super('works_set', WorksSet, db)
  }

  /**
   * 根据作品集在站点的id和入库任务的id查询作品集
   * @param siteWorksSetId 作品集在站点的id
   * @param taskId 入库任务的id
   */
  public async getBySiteWorksSetIdAndTaskId(siteWorksSetId: string, taskId: number): Promise<WorksSet | undefined> {
    const queryDTO = new WorksSetQueryDTO()
    queryDTO.siteWorksSetId = siteWorksSetId
    const whereClauseAndQuery = super.getWhereClause(queryDTO)
    const whereClause = whereClauseAndQuery.whereClause
    let modifiedQuery
    if (NotNullish(whereClauseAndQuery.query)) {
      modifiedQuery = whereClauseAndQuery.query.toPlainParams()
    }
    const statement = `SELECT *
                       FROM works_set ${whereClause}`
    const db = super.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, modifiedQuery)
      .then((rows) => {
        const result = super.toResultTypeDataList(rows) as WorksSet[]
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
