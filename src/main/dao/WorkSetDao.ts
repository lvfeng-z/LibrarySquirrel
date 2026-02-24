import BaseDao from '../base/BaseDao.ts'
import WorkSetQueryDTO from '@shared/model/queryDTO/WorkSetQueryDTO.ts'
import WorkSet from '@shared/model/entity/WorkSet.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import LogUtil from '../util/LogUtil.ts'
import { NotNullish } from '@shared/util/CommonUtil.ts'
import { toPlainParams } from '../util/DatabaseUtil.ts'
import WorkSetWithWorkId from '@shared/model/domain/WorkSetWithWorkId.ts'
import Page from '@shared/model/util/Page.ts'
import { BOOL } from '@shared/model/constant/BOOL.ts'
import Resource from '@shared/model/entity/Resource.ts'
import ResourceWithWorkSetId from '@shared/model/domain/ResourceWithWorkSetId.ts'

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
      modifiedQuery = toPlainParams(whereClauseAndQuery.query)
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

  /**
   * 根据作品id查询作品集列表
   * @param workId 作品id
   */
  public async listByWorkId(workId: number): Promise<WorkSet[]> {
    const clause = `
      SELECT ws.*
      FROM work_set ws
               INNER JOIN re_work_work_set rwws ON ws.id = rwws.work_set_id
      WHERE rwws.work_id = @workId`
    const db = this.acquire()
    try {
      const row = await db.all<unknown[], Record<string, unknown>>(clause, workId)
      return this.toResultTypeDataList<WorkSet>(row)
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  /**
   * 分页查询作品集（包含封面资源）
   * @param page 分页查询参数
   */
  public async queryPageWithCover(page: Page<WorkSetQueryDTO, WorkSet>): Promise<Page<WorkSetQueryDTO, WorkSet>> {
    // 生成 where 字句
    let whereClause: string | undefined
    const modifiedPage = new Page(page)
    if (page.query) {
      const whereClauseAndQuery = this.getWhereClause(page.query, undefined, ['sort'])
      whereClause = whereClauseAndQuery.whereClause
      modifiedPage.query = whereClauseAndQuery.query
    }

    // 拼接查询语句
    let statement = `SELECT * FROM "work_set"`
    if (whereClause !== undefined) {
      statement = statement.concat(' ', whereClause)
    }

    // 拼接排序和分页字句
    const sort = NotNullish(page.query?.sort) ? page.query.sort : []
    statement = await this.sortAndPage(statement, modifiedPage, sort, this.tableName)

    if (modifiedPage.currentCount < 1) {
      modifiedPage.data = []
      return modifiedPage
    }

    // 查询
    let plainParams: Record<string, unknown> | undefined = undefined
    if (NotNullish(modifiedPage.query)) {
      plainParams = toPlainParams(modifiedPage.query)
    }

    const db = this.acquire()
    try {
      const rows = await db.all<unknown[], Record<string, unknown>>(statement, plainParams)
      modifiedPage.data = this.toResultTypeDataList<WorkSet>(rows)
      return modifiedPage
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  /**
   * 根据作品集id列表查询封面资源
   * @param workSetIds 作品集id列表
   */
  public async listCoverResourceByWorkSetIds(workSetIds: number[]): Promise<Map<number, Resource>> {
    if (workSetIds.length === 0) {
      return new Map()
    }

    const workSetIdClause = workSetIds.join(',')

    // 查询设置了封面的作品资源
    const coverStatement = `
      SELECT r.*, rwws.work_set_id as work_set_id
      FROM resource r
               INNER JOIN work w ON r.work_id = w.id
               INNER JOIN re_work_work_set rwws ON w.id = rwws.work_id
      WHERE rwws.work_set_id IN (${workSetIdClause})
        AND rwws.is_cover = ${BOOL.TRUE}
        AND r.state = ${BOOL.TRUE}`

    const db = this.acquire()
    try {
      const coverResult = await db.all<unknown[], Record<string, unknown>>(coverStatement)
      const coverResourceMap = new Map<number, Resource>()

      // 转换为 ResourceWithWorkSetId 后提取 workSetId，避免使用 as 类型断言
      const coverResourceList = super.toResultTypeDataList<ResourceWithWorkSetId>(coverResult)

      // 处理封面资源
      for (const resourceWithWorkSetId of coverResourceList) {
        const workSetId = resourceWithWorkSetId.workSetId
        if (NotNullish(workSetId) && !coverResourceMap.has(workSetId)) {
          coverResourceMap.set(workSetId, resourceWithWorkSetId)
        }
      }

      // 获取没有封面的作品集，查询默认封面
      const workSetIdsWithoutCover = workSetIds.filter((id) => !coverResourceMap.has(id))
      if (workSetIdsWithoutCover.length > 0) {
        const workSetIdClauseWithoutCover = workSetIdsWithoutCover.join(',')
        const defaultCoverClauses = `
          SELECT r.*, rwws.work_set_id as work_set_id
          FROM resource r
                   INNER JOIN work w ON r.work_id = w.id
                   INNER JOIN re_work_work_set rwws ON w.id = rwws.work_id
          WHERE rwws.work_set_id IN (${workSetIdClauseWithoutCover})
            AND r.state = ${BOOL.TRUE}
          ORDER BY rwws.sort_order ASC, rwws.id ASC`

        const defaultResult = await db.all<unknown[], Record<string, unknown>>(defaultCoverClauses)

        // 转换为 ResourceWithWorkSetId 后提取 workSetId
        const defaultResourceList = super.toResultTypeDataList<ResourceWithWorkSetId>(defaultResult)

        // 取每个作品集的第一个资源作为默认封面
        const processedWorkSetIds = new Set<number>()
        for (const resourceWithWorkSetId of defaultResourceList) {
          const workSetId = resourceWithWorkSetId.workSetId
          if (NotNullish(workSetId) && !processedWorkSetIds.has(workSetId)) {
            processedWorkSetIds.add(workSetId)
            if (!coverResourceMap.has(workSetId)) {
              coverResourceMap.set(workSetId, resourceWithWorkSetId)
            }
          }
        }
      }

      return coverResourceMap
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }
}
