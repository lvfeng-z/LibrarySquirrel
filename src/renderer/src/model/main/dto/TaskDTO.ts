import Task from '../Task.ts'

/**
 * 任务
 */
export default class TaskDTO extends Task {
  /**
   * 子任务（用于el-table的树形数据回显）
   */
  children: TaskDTO[] | undefined | null

  /**
   * 是否有子任务（用于el-table的树形数据回显）
   */
  hasChildren: boolean | undefined | null

  /**
   * 进度
   */
  schedule: number | undefined | null

  constructor(taskDTO?: TaskDTO | Task) {
    if (taskDTO === undefined) {
      super()
      this.children = undefined
      this.hasChildren = undefined
      this.schedule = undefined
    } else {
      super(taskDTO)
      if (taskDTO instanceof TaskDTO) {
        this.children = taskDTO.children
        this.hasChildren = taskDTO.hasChildren
        this.schedule = taskDTO.schedule
      } else {
        this.children = undefined
        this.hasChildren = undefined
        this.schedule = undefined
      }
    }
  }
}