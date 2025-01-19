import Task from '../entity/Task.ts'
import { notNullish } from '../../util/CommonUtil.js'
import lodash from 'lodash'

/**
 * 创建任务DTO
 */
export default class TaskCreateDTO extends Task {
  /**
   * 是否已保存
   */
  saved: boolean | undefined | null

  /**
   * 站点domain
   */
  siteDomain: string | undefined | null

  constructor(taskCreateDTO?: Task) {
    super(taskCreateDTO)
    if (notNullish(taskCreateDTO)) {
      lodash.assign(this, lodash.pick(taskCreateDTO, ['saved', 'siteDomain']))
    }
  }
}
