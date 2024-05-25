import BaseDao from './BaseDao.ts'
import Task from '../model/Task.ts'
import TaskQueryDTO from '../model/queryDTO/TaskQueryDTO.ts'

export default class TaskDao extends BaseDao<TaskQueryDTO, Task> {
  constructor() {
    super('task', 'TaskDao')
  }
  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
