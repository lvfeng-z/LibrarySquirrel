import Task from '../Task.ts'

/**
 * 创建任务DTO
 */
export default class TaskCreateDTO extends Task {
  /**
   * 是否已保存
   */
  saved: boolean | undefined | null

  constructor(taskCreateDTO?: TaskCreateDTO | Task) {
    if (taskCreateDTO === undefined) {
      super()
      this.saved = undefined
    } else {
      super(taskCreateDTO)
      if (taskCreateDTO instanceof TaskCreateDTO) {
        this.saved = taskCreateDTO.saved
      } else {
        this.saved = undefined
      }
    }
  }
}
