import lodash from 'lodash'
import Task from '../entity/Task.js'
import { NotNullish } from '../../util/CommonUtil.js'

export default class TaskProgressDTO extends Task {
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

  constructor(taskProcessingDTO?: Task) {
    super(taskProcessingDTO)
    if (NotNullish(taskProcessingDTO)) {
      lodash.assign(this, lodash.pick(taskProcessingDTO, ['schedule', 'total', 'finished', 'siteName']))
    }
  }
}
