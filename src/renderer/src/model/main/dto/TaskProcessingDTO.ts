import Task from '@renderer/model/main/entity/Task.ts'
import { isNullish } from '@renderer/utils/CommonUtil.ts'
import TaskDTO from '@renderer/model/main/dto/TaskDTO.ts'

export default class TaskProcessingDTO extends TaskDTO {
  /**
   * 进度
   */
  schedule: number | undefined | null

  /**
   * 总量
   */
  total: number | undefined | null

  /**
   * 已完成的量
   */
  finished: number | undefined | null

  /**
   * 站点名称
   */
  siteName: string | undefined | null

  constructor(taskProcessingDTO?: TaskProcessingDTO | Task) {
    super(taskProcessingDTO)
    if (isNullish(taskProcessingDTO)) {
      this.schedule = undefined
      this.total = undefined
      this.finished = undefined
      this.siteName = undefined
    } else {
      if (taskProcessingDTO instanceof TaskProcessingDTO) {
        this.schedule = taskProcessingDTO.schedule
        this.total = taskProcessingDTO.total
        this.finished = taskProcessingDTO.finished
        this.siteName = taskProcessingDTO.siteName
      } else {
        this.schedule = undefined
        this.total = undefined
        this.finished = undefined
        this.siteName = undefined
      }
    }
  }
}
