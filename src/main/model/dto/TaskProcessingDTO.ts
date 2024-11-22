import Task from '../entity/Task.js'
import { isNullish } from '../../util/CommonUtil.js'
import TaskDTO from './TaskDTO.js'

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

  constructor(taskProcessingDTO?: TaskProcessingDTO | Task) {
    super(taskProcessingDTO)
    if (isNullish(taskProcessingDTO)) {
      this.schedule = undefined
      this.total = undefined
      this.finished = undefined
    } else {
      if (taskProcessingDTO instanceof TaskProcessingDTO) {
        this.schedule = taskProcessingDTO.schedule
        this.total = taskProcessingDTO.total
        this.finished = taskProcessingDTO.finished
      } else {
        this.schedule = undefined
        this.total = undefined
        this.finished = undefined
      }
    }
  }
}
