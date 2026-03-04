import Task from '../entity/Task.ts'
import { NotNullish } from '../../util/CommonUtil.ts'

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
    if (NotNullish(taskCreateDTO)) {
      this.siteName = taskCreateDTO.siteName
    }
  }
}
