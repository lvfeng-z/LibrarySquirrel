import { isNullish } from '../../../utils/CommonUtil'
import { TaskStatesEnum } from '../../../constants/TaskStatesEnum'

export default class TaskScheduleDTO {
  /**
   * 主键
   */
  id: number | undefined | null

  /**
   * 状态
   */
  status: TaskStatesEnum | undefined | null

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

  constructor(taskScheduleDTO?: TaskScheduleDTO) {
    if (isNullish(taskScheduleDTO)) {
      this.id = undefined
      this.status = undefined
      this.schedule = undefined
      this.total = undefined
      this.finished = undefined
    } else {
      this.id = taskScheduleDTO.id
      this.status = taskScheduleDTO.status
      this.schedule = taskScheduleDTO.schedule
      this.total = taskScheduleDTO.total
      this.finished = taskScheduleDTO.finished
    }
  }
}
