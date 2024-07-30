import BaseDao from './BaseDao.ts'
import Task from '../model/Task.ts'
import TaskQueryDTO from '../model/queryDTO/TaskQueryDTO.ts'
import DB from '../database/DB.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import { isNullish, notNullish } from '../util/CommonUtil.ts'
import StringUtil from '../util/StringUtil.ts'

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
    modifiedPage.query.parentId = undefined

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
      whereClauseArray.push('(is_collection = 1 or parent_id is null)')

      const temp = super.splicingWhereClauses(whereClauseArray)
      whereClause = StringUtil.isNotBlank(temp) ? temp : ''
    }

    let statement = selectClause.concat(' ', whereClause)
    statement = await super.sorterAndPager(statement, whereClause, modifiedPage)

    // 查询
    const db = this.acquire()
    try {
      const rows = (await db.prepare(statement)).all(modifiedPage.query) as object[]
      modifiedPage.data = super.getResultTypeDataList<Task>(rows)
      return modifiedPage
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  /**
   * 查询任务id列表中包含的所有子任务
   * @param taskIds
   */
  async selectUnRepeatChildTask(taskIds: number[]): Promise<Task[]> {
    const idsStr = taskIds.join(',')
    const statement = `select distinct * from task where (id in (${idsStr}) and is_collection = 0) or parent_id in (${idsStr})`
    const db = this.acquire()
    try {
      const rows = (await db.prepare(statement)).all() as object[]
      return super.getResultTypeDataList<Task>(rows)
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
