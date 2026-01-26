import BaseDao from '../base/BaseDao.ts'
import WorkSetQueryDTO from '../model/queryDTO/WorkSetQueryDTO.ts'
import WorkSet from '../model/entity/WorkSet.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import LogUtil from '../util/LogUtil.ts'
import { NotNullish } from '../util/CommonUtil.ts'
import BaseQueryDTO from '../base/BaseQueryDTO.js'
import WorkSetWithWorkId from '../model/domain/WorkSetWithWorkId.ts'

export default class WorkSetDao extends BaseDao<WorkSetQueryDTO, WorkSet> {
  constructor(db: DatabaseClient, injectedDB: boolean) {
    super('work_set', WorkSet, db, injectedDB)
  }

  /**
   * 根据作品集在站点的id和入库任务的id查询作品集
   * @param siteWorkSetId 作品集在站点的id
   * @param taskId 入库任务的id
   */
  public async getBySiteWorkSetIdAndTaskId(siteWorkSetId: string, taskId: number): Promise<WorkSet | undefined> {
    const queryDTO = new WorkSetQueryDTO()
    queryDTO.siteWorkSetId = siteWorkSetId
    const whereClauseAndQuery = super.getWhereClause(queryDTO)
    const whereClause = whereClauseAndQuery.whereClause
    let modifiedQuery
    if (NotNullish(whereClauseAndQuery.query)) {
      modifiedQuery = BaseQueryDTO.toPlainParams(whereClauseAndQuery.query)
    }
    const statement = `SELECT *
                       FROM work_set ${whereClause}`
    const db = super.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, modifiedQuery)
      .then((rows) => {
        const result = super.toResultTypeDataList(rows) as WorkSet[]
        if (result.length > 1) {
          LogUtil.warn(
            this.constructor.name,
            `同一站点作品集id和导入任务id下，存在多个作品集，siteWorkSetId: ${siteWorkSetId}，taskId: ${taskId}`
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

  /**
   * 根据作品集在站点的id和站点名称查询作品集
   * @param siteWorkSetId 作品集在站点的id
   * @param siteName 入库任务的id
   */
  public async getBySiteWorkSetIdAndSiteName(siteWorkSetId: string, siteName: string): Promise<WorkSet | undefined> {
    const statement = `SELECT *
                       FROM work_set ws
                         INNER JOIN site ON ws.site_id = site.id
                       WHERE ws.site_work_set_id = @siteWorkSetId AND site.name = @siteName`
    const db = this.acquire()
    try {
      const row = await db.get<unknown[], Record<string, unknown>>(statement, { siteWorkSetId, siteName })

      if (NotNullish(row)) {
        return this.toResultTypeData<WorkSet>(row)
      }
      return undefined
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  public async listBySiteWorkSet(siteWorkSets: { siteWorkSetId: string; siteId: number }[]): Promise<WorkSet[]> {
    const whereClause = siteWorkSets
      .map((siteWorkSet) => `(site_work_set_id = ${siteWorkSet.siteWorkSetId} AND site_id = ${siteWorkSet.siteId})`)
      .join(' OR ')
    const statement = `SELECT *
                       FROM work_set
                       WHERE ${whereClause}`
    const db = this.acquire()
    try {
      const rows = await db.all<unknown[], Record<string, unknown>>(statement)
      return this.toResultTypeDataList<WorkSet>(rows)
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  /**
   * 根据作品id列表作品集+作品id
   * @param workIds 作品id列表
   */
  public async listWorkSetWithWorkIdByWorkIds(workIds: number[]): Promise<WorkSetWithWorkId[]> {
    const clause = `
      SELECT ws.*, w.id AS workId
      FROM work_set ws
               INNER JOIN re_work_work_set rwws ON ws.id = rwws.work_set_id
               INNER JOIN work w ON rwws.work_id = w.id
      WHERE w.id IN (${workIds.join(',')})`
    const db = this.acquire()
    try {
      const row = await db.all<unknown[], Record<string, unknown>>(clause)
      return this.toResultTypeDataList<WorkSetWithWorkId>(row)
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }
}
