import Task from '../Task.ts'

/**
 * 任务
 */
export default class TaskDTO extends Task {
  /**
   * 子任务（用于el-table的树形数据回显）
   */
  children: TaskDTO[] | undefined | null

  constructor(taskDTO?: TaskDTO) {
    if (taskDTO === undefined) {
      super()
      this.children = undefined
    } else {
      super(taskDTO)
      this.children = taskDTO.children
    }
  }
}
