import BaseDao from '../base/BaseDao.ts'
import Task from '../model/entity/Task.ts'
import TaskQueryDTO from '../model/queryDTO/TaskQueryDTO.ts'
import DB from '../database/DB.ts'
import Page from '../model/util/Page.ts'
import { IsNullish, NotNullish } from '../util/CommonUtil.ts'
import StringUtil from '../util/StringUtil.ts'
import TaskScheduleDTO from '../model/dto/TaskScheduleDTO.ts'
import TaskTreeDTO from '../model/dto/TaskTreeDTO.ts'
import { BuildTree } from '../util/TreeUtil.ts'
import { TaskStatusEnum } from '../constant/TaskStatusEnum.ts'

export default class TaskDao extends BaseDao<TaskQueryDTO, Task> {
  constructor(db: DB, injectedDB: boolean) {
    super('task', Task, db, injectedDB)
  }

  /**
   * 更新任务状态
   * @param taskId 任务id
   */
  async refreshTaskStatus(taskId: number): Promise<number> {
    const statement = `
        WITH total as (SELECT COUNT(1) AS num FROM task WHERE pid = ${taskId}),
             finished as (SELECT COUNT(1) AS num FROM task WHERE pid = ${taskId} AND status = ${TaskStatusEnum.FINISHED}),
             faild as (SELECT COUNT(1) AS num FROM task WHERE pid = ${taskId} AND status = ${TaskStatusEnum.FAILED})
        update task set status = (
            CASE
                WHEN (SELECT num FROM finished) = (SELECT num FROM total) THEN ${TaskStatusEnum.FINISHED}
                WHEN (SELECT num FROM faild) = (SELECT num FROM total) THEN ${TaskStatusEnum.FAILED}
                WHEN (SELECT num FROM total) > (SELECT num FROM finished) AND (SELECT num FROM finished) > 0
                  THEN ${TaskStatusEnum.PARTLY_FINISHED}
            end)
        WHERE id = ${taskId}`

    const db = this.acquire()
    return db
      .run(statement)
      .then((runResult) => runResult.changes)
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 分页查询父任务
   * @param page
   */
  async queryParentPage(page: Page<TaskQueryDTO, Task>) {
    const modifiedPage = new Page(page)
    if (IsNullish(modifiedPage.query)) {
      modifiedPage.query = new TaskQueryDTO()
    }
    // 清除isCollection的值
    modifiedPage.query.isCollection = undefined
    modifiedPage.query.pid = undefined

    const selectClause = 'SELECT * FROM task t1'

    // 拼接where字句
    let whereClauseList: string[] = []
    if (NotNullish(modifiedPage.query)) {
      // 生成where字句列表
      const whereClauseAndQuery = super.getWhereClauses(modifiedPage.query, 't1', ['siteId'])
      const whereClauses = whereClauseAndQuery.whereClauses
      modifiedPage.query = whereClauseAndQuery.query
      whereClauseList = whereClauses.values().toArray()
    }
    modifiedPage.query.siteId = page.query?.siteId

    // 查询是父任务的或者只有单个任务的
    whereClauseList.push('(t1.is_collection = 1 OR t1.pid IS NULL OR t1.pid = 0)')
    // 查询存在指定站点的子任务的
    if (NotNullish(modifiedPage.query.siteId)) {
      whereClauseList.push(`EXISTS(SELECT 1 FROM task ct1 WHERE ct1.pid = t1.id AND ct1.site_id = ${modifiedPage.query.siteId})`)
    }
    const tempWhereClause = super.splicingWhereClauses(whereClauseList)
    const whereClause = StringUtil.isNotBlank(tempWhereClause) ? tempWhereClause : ''

    let statement = selectClause.concat(' ', whereClause)
    const sort = IsNullish(page.query?.sort) ? [] : page.query.sort
    statement = await super.sortAndPage(statement, modifiedPage, sort)

    // 查询
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, modifiedPage.query)
      .then((rows) => {
        modifiedPage.data = super.toResultTypeDataList<Task>(rows)
        return modifiedPage
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 设置任务树的状态
   * @param taskIds
   * @param status 状态
   * @param includeStatus 包含的状态
   */
  async setTaskTreeStatus(taskIds: number[], status: TaskStatusEnum, includeStatus?: TaskStatusEnum[]): Promise<number> {
    const idsStr = taskIds.join(',')
    const statusStr = includeStatus?.join(',')
    const statement = `WITH children AS (SELECT id, is_collection, IFNULL(pid, 0) AS pid, task_name, site_id, site_works_id, url, create_time, update_time, status,
                                                pending_resource_id, continuable, plugin_author, plugin_name, plugin_version, plugin_data, error_message FROM task WHERE id in (${idsStr}) AND is_collection = 0),
                            parent as (SELECT id, is_collection, 0 as pid, task_name, site_id, site_works_id, url, create_time, update_time, status, pending_resource_id,
                                              continuable, plugin_author, plugin_name, plugin_version, plugin_data, error_message FROM task WHERE id in (${idsStr}) AND is_collection = 1)
                       update task set status = ${status} WHERE id in(
                          SELECT id FROM children ${NotNullish(includeStatus) ? 'WHERE status in (' + statusStr + ')' : ''}
                          UNION
                          SELECT id FROM parent ${NotNullish(includeStatus) ? 'WHERE status in (' + statusStr + ')' : ''}
                          UNION
                          SELECT id
                          FROM task
                          WHERE id in (SELECT pid FROM children) ${NotNullish(includeStatus) ? 'and status in (' + statusStr + ')' : ''}
                          UNION
                          SELECT id
                          FROM task
                          WHERE pid in (SELECT id FROM parent) ${NotNullish(includeStatus) ? 'and status in (' + statusStr + ')' : ''}
                       )`
    const db = this.acquire()
    return db
      .run(statement)
      .then((runResult) => runResult.changes)
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 获取指定任务所在的树形任务列表
   * @param taskIds 任务id
   * @param includeStatus 指定的任务状态
   */
  async listTaskTree(taskIds: number[], includeStatus?: TaskStatusEnum[]): Promise<TaskTreeDTO[]> {
    const idsStr = taskIds.join(',')
    const statusStr = includeStatus?.join(',')
    const statement = `WITH children AS (SELECT id, is_collection, IFNULL(pid, 0) AS pid, task_name, site_id, site_works_id, url, create_time, update_time, status, pending_resource_id,
                                                continuable, plugin_author, plugin_name, plugin_version, plugin_data, error_message FROM task WHERE id in (${idsStr}) AND is_collection = 0),
                            parent as (SELECT id, is_collection, 0 as pid, task_name, site_id, site_works_id, url, create_time, update_time, status, pending_resource_id,
                                              continuable, plugin_author, plugin_name, plugin_version, plugin_data, error_message FROM task WHERE id in (${idsStr}) AND is_collection = 1)

                       SELECT * FROM children ${NotNullish(includeStatus) ? 'WHERE status in (' + statusStr + ')' : ''}
                       UNION
                       SELECT * FROM parent ${NotNullish(includeStatus) ? 'WHERE status in (' + statusStr + ')' : ''}
                       UNION
                       SELECT id, is_collection, 0 as pid, task_name, site_id, site_works_id, url, create_time, update_time, status, pending_resource_id,
                              continuable, plugin_author, plugin_name, plugin_version, plugin_data, error_message
                       FROM task
                       WHERE id in (SELECT pid FROM children)
                       UNION
                       SELECT *
                       FROM task
                       WHERE pid in (SELECT id FROM parent) ${NotNullish(includeStatus) ? 'and status in (' + statusStr + ')' : ''}`
    let sourceTasks: TaskTreeDTO[]
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((rows) => {
        sourceTasks = super.toResultTypeDataList<TaskTreeDTO>(rows)
        return BuildTree(sourceTasks, 0)
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 查询状态列表
   * @param ids
   */
  async listStatus(ids: number[]): Promise<TaskScheduleDTO[]> {
    const idsStr = ids.join(',')
    const statement = `SELECT id, pid, status, CASE WHEN status = ${TaskStatusEnum.FINISHED} THEN 100 END AS schedule
                       FROM "${this.tableName}"
                       WHERE id in (${idsStr})`
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((rows) => super.toResultTypeDataList<TaskScheduleDTO>(rows))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
