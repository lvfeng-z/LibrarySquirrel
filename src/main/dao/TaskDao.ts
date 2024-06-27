import BaseDao from './BaseDao.ts'
import Task from '../model/Task.ts'
import TaskQueryDTO from '../model/queryDTO/TaskQueryDTO.ts'
import DB from '../database/DB.ts'

export default class TaskDao extends BaseDao<TaskQueryDTO, Task> {
  constructor(db?: DB) {
    super('task', 'TaskDao', db)
  }
  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
