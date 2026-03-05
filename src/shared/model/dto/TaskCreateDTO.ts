import Task from '../entity/Task.ts'
import { notNullish } from '../../util/CommonUtil.ts'

/**
 * 创建任务DTO
 */
export default class TaskCreateDTO extends Task {
  /**
   * 站点名称
   */
  siteName: string | undefined | null

  constructor(taskCreateDTO?: TaskCreateDTO) {
    super(taskCreateDTO)
    if (notNullish(taskCreateDTO)) {
      this.siteName = taskCreateDTO.siteName
    }
  }
}
