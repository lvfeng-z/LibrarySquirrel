import { NotNullish } from '../../../utils/CommonUtil'
import { TaskStatusEnum } from '../../../constants/TaskStatusEnum.ts'
import lodash from 'lodash'

export default class TaskScheduleDTO {
  /**
   * 主键
   */
  id: number | undefined | null

  /**
   * 上级任务id
   */
  pid: number | undefined | null

  /**
   * 状态
   */
  status: TaskStatusEnum | undefined | null

  /**
   * 总量（父任务的子任务总量）
   */
  total: number | undefined | null

  /**
   * 已完成的量（父任务的已完成子任务的量）
   */
  finished: number | undefined | null

  constructor(taskScheduleDTO?: TaskScheduleDTO) {
    if (NotNullish(taskScheduleDTO)) {
      lodash.assign(this, lodash.pick(taskScheduleDTO, ['id', 'pid', 'status', 'total', 'finished']))
    }
  }
}
