import BaseDao from './BaseDao.ts'
import Task from '../model/entity/Task.ts'
import TaskQueryDTO from '../model/queryDTO/TaskQueryDTO.ts'
import DB from '../database/DB.ts'
import PageModel from '../model/util/PageModel.ts'
import { isNullish, notNullish } from '../util/CommonUtil.ts'
import StringUtil from '../util/StringUtil.ts'
import TaskScheduleDTO from '../model/dto/TaskScheduleDTO.ts'
import TaskDTO from '../model/dto/TaskDTO.ts'
import { buildTree } from '../util/TreeUtil.ts'
import { TaskStatusEnum } from '../constant/TaskStatusEnum.ts'

export default class TaskDao extends BaseDao<TaskQueryDTO, Task> {
  constructor(db?: DB) {
    super('task', 'TaskDao', db)
  }

  /**
   * 更新任务状态
   * @param taskId 任务id
   */
  async refreshTaskStatus(taskId: number): Promise<number> {
    const statement = `
        with total as (select count(1) as num from task where pid = ${taskId}),
             finished as (select count(1) as num from task where pid = ${taskId} and status = ${TaskStatusEnum.FINISHED}),
             faild as (select count(1) as num from task where pid = ${taskId} and status = ${TaskStatusEnum.FAILED})
        update task set status = (
            case
                when (select num from finished) = (select num from total) then ${TaskStatusEnum.FINISHED}
                when (select num from faild) = (select num from total) then ${TaskStatusEnum.FAILED}
                when (select num from total) > (select num from finished) and (select num from finished) > 0
                  then ${TaskStatusEnum.PARTLY_FINISHED}
            end)
        where id = ${taskId}`

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
  async queryParentPage(page: PageModel<TaskQueryDTO, Task>) {
    const modifiedPage = new PageModel(page)
    if (isNullish(modifiedPage.query)) {
      modifiedPage.query = new TaskQueryDTO()
    }
    // 清除isCollection的值
    modifiedPage.query.isCollection = undefined
    modifiedPage.query.pid = undefined

    const selectClause = 'select * from task'

    // 拼接where字句
    let whereClause: string = ''
    if (notNullish(modifiedPage.query)) {
      // 生成where字句列表
      const whereClauseAndQuery = super.getWhereClauses(modifiedPage.query)
      const whereClauses = whereClauseAndQuery.whereClauses
      modifiedPage.query = whereClauseAndQuery.query
      const whereClauseArray = Object.entries(whereClauses).map(([, value]) => value)

      // 查询是父任务的或者只有单个任务的
      whereClauseArray.push('(is_collection = 1 or pid is null or pid = 0)')

      const temp = super.splicingWhereClauses(whereClauseArray)
      whereClause = StringUtil.isNotBlank(temp) ? temp : ''
    }

    let statement = selectClause.concat(' ', whereClause)
    statement = await super.sorterAndPager(statement, whereClause, modifiedPage)

    // 查询
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, modifiedPage.query)
      .then((rows) => {
        modifiedPage.data = super.getResultTypeDataList<Task>(rows)
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
    const statement = `with children as (select id, is_collection, ifnull(pid, 0) as pid, task_name, site_domain, local_works_id, site_works_id, url, create_time, update_time,
                                                status, pending_download_path, continuable, plugin_id, plugin_info, plugin_data from task where id in (${idsStr}) and is_collection = 0),
                            parent as (select id, is_collection, 0 as pid, task_name, site_domain, local_works_id, site_works_id, url, create_time, update_time,
                                              status, pending_download_path, continuable, plugin_id, plugin_info, plugin_data from task where id in (${idsStr}) and is_collection = 1)
                       update task set status = ${status} where id in(
                          select id from children ${notNullish(includeStatus) ? 'where status in (' + statusStr + ')' : ''}
                          union
                          select id from parent ${notNullish(includeStatus) ? 'where status in (' + statusStr + ')' : ''}
                          union
                          select id
                          from task
                          where id in (select pid from children) ${notNullish(includeStatus) ? 'and status in (' + statusStr + ')' : ''}
                          union
                          select id
                          from task
                          where pid in (select id from parent) ${notNullish(includeStatus) ? 'and status in (' + statusStr + ')' : ''}
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
   * 获取树形任务列表
   * @param taskIds 任务id
   * @param includeStatus 指定的任务状态
   */
  async listTaskTree(taskIds: number[], includeStatus?: TaskStatusEnum[]): Promise<TaskDTO[]> {
    const idsStr = taskIds.join(',')
    const statusStr = includeStatus?.join(',')
    const statement = `with children as (select id, is_collection, ifnull(pid, 0) as pid, task_name, site_domain, local_works_id, site_works_id, url, create_time, update_time,
                                                status, pending_download_path, continuable, plugin_id, plugin_info, plugin_data from task where id in (${idsStr}) and is_collection = 0),
                            parent as (select id, is_collection, 0 as pid, task_name, site_domain, local_works_id, site_works_id, url, create_time, update_time,
                                              status, pending_download_path, continuable, plugin_id, plugin_info, plugin_data from task where id in (${idsStr}) and is_collection = 1)

                       select * from children ${notNullish(includeStatus) ? 'where status in (' + statusStr + ')' : ''}
                       union
                       select * from parent ${notNullish(includeStatus) ? 'where status in (' + statusStr + ')' : ''}
                       union
                       select id, is_collection, 0 as pid, task_name, site_domain, local_works_id, site_works_id, url, create_time,
                              update_time, status, pending_download_path, continuable, plugin_id, plugin_info, plugin_data
                       from task
                       where id in (select pid from children)
                       union
                       select *
                       from task
                       where pid in (select id from parent) ${notNullish(includeStatus) ? 'and status in (' + statusStr + ')' : ''}`
    let sourceTasks: TaskDTO[]
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((rows) => {
        sourceTasks = super.getResultTypeDataList<TaskDTO>(rows)
        return buildTree(sourceTasks, 0)
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
    const statement = `SELECT id, status, CASE WHEN status = ${TaskStatusEnum.FINISHED} THEN 100 END as schedule
                       FROM "${this.tableName}"
                       WHERE id in (${idsStr})`
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((rows) => super.getResultTypeDataList<TaskScheduleDTO>(rows))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
