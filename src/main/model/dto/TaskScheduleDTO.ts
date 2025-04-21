import { TaskStatusEnum } from '../../constant/TaskStatusEnum.ts'
import { NotNullish } from '../../util/CommonUtil.js'
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
   * 总量
   */
  total: number | undefined | null

  /**
   * 已完成的量
   */
  finished: number | undefined | null

  constructor(taskScheduleDTO?: TaskScheduleDTO) {
    if (NotNullish(taskScheduleDTO)) {
      lodash.assign(this, lodash.pick(taskScheduleDTO, ['id', 'pid', 'status', 'total', 'finished']))
    }
  }
}
