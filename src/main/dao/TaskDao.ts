import BaseDao from './BaseDao.ts'
import Task from '../model/Task.ts'
import TaskQueryDTO from '../model/queryDTO/TaskQueryDTO.ts'
import DB from '../database/DB.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import { isNullish, notNullish } from '../util/CommonUtil.ts'
import StringUtil from '../util/StringUtil.ts'
import TaskScheduleDTO from '../model/dto/TaskScheduleDTO.ts'
import TaskDTO from '../model/dto/TaskDTO.ts'
import { buildTree } from '../util/TreeUtil.ts'

export default class TaskDao extends BaseDao<TaskQueryDTO, Task> {
  constructor(db?: DB) {
    super('task', 'TaskDao', db)
  }

  /**
   * 分页查询任务集合
   * @param page
   */
  async selectParentPage(page: PageModel<TaskQueryDTO, Task>) {
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

      // 查询是集合的或者只有单个任务的
      whereClauseArray.push('(is_collection = 1 or pid is null)')

      const temp = super.splicingWhereClauses(whereClauseArray)
      whereClause = StringUtil.isNotBlank(temp) ? temp : ''
    }

    let statement = selectClause.concat(' ', whereClause)
    statement = await super.sorterAndPager(statement, whereClause, modifiedPage)

    // 查询
    const db = this.acquire()
    try {
      const rows = (await db.all(statement, modifiedPage.query)) as object[]
      modifiedPage.data = super.getResultTypeDataList<Task>(rows)
      return modifiedPage
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  /**
   * 获取树形任务列表
   * @param taskIds
   */
  async selectTaskTreeList(taskIds: number[]): Promise<TaskDTO[]> {
    const idsStr = taskIds.join(',')
    const statement = `with children as (select id, is_collection, ifnull(pid, 'root') as pid, task_name, site_domain, local_works_id, site_works_id, url, create_time,
                                                update_time, status, plugin_id, plugin_info, plugin_data from task where id in (${idsStr}) and is_collection = 0),
                            parent as (select id, is_collection, 'root' as pid, task_name, site_domain, local_works_id, site_works_id, url, create_time,
                                              update_time, status, plugin_id, plugin_info, plugin_data from task where id in (${idsStr}) and is_collection = 1)

                       select * from children
                       union
                       select * from parent
                       union
                       select * from task where id in (select pid from children)
                       union
                       select * from task where pid in (select id from parent)`
    const db = this.acquire()
    let sourceTasks: TaskDTO[]
    try {
      const rows = (await db.all(statement)) as object[]
      sourceTasks = super.getResultTypeDataList<TaskDTO>(rows)
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }

    return buildTree(sourceTasks, 'root')
  }

  /**
   * 查询状态列表
   * @param ids
   */
  async selectStatusList(ids: number[]): Promise<TaskScheduleDTO[]> {
    const idsStr = ids.join(',')
    const statement = `SELECT id, status, CASE WHEN status = 3 THEN 100 END as schedule
                       FROM "${this.tableName}"
                       WHERE id in (${idsStr})`
    const db = this.acquire()
    try {
      const rows = (await db.all(statement)) as object[]
      return super.getResultTypeDataList<TaskScheduleDTO>(rows)
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
