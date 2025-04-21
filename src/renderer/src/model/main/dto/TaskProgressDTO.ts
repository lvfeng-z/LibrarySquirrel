import Task from '@renderer/model/main/entity/Task.ts'
import lodash from 'lodash'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

export default class TaskProgressDTO extends Task {
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

  constructor(taskProcessingDTO?: Task) {
    super(taskProcessingDTO)
    if (NotNullish(taskProcessingDTO)) {
      lodash.assign(this, lodash.pick(taskProcessingDTO, ['total', 'finished', 'siteName']))
    }
  }
}
