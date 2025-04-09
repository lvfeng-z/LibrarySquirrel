import Task from '../entity/Task.ts'
import { NotNullish } from '../../util/CommonUtil.js'
import { OriginType } from '../../constant/OriginType.js'

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

  /**
   * 来源类型
   */
  originType: OriginType | undefined | null

  constructor(taskCreateDTO?: TaskCreateDTO) {
    super(taskCreateDTO)
    if (NotNullish(taskCreateDTO)) {
      this.saved = taskCreateDTO.saved
      this.siteDomain = taskCreateDTO.siteDomain
      this.originType = taskCreateDTO.originType
    }
  }
}
