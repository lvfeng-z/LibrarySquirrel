import BaseQueryDTO from '../../base/BaseQueryDTO.js'
import { NotNullish } from '../../util/CommonUtil.js'

/**
 * 作品-作品集关联表QueryDTO
 */
export default class ReWorkWorkSetQueryDTO extends BaseQueryDTO {
  /**
   * 作品id
   */
  workId: number | undefined | null
  /**
   * 作品集id
   */
  workSetId: number | undefined | null
  /**
   * 排序顺序
   */
  sortOrder: number | undefined | null

  constructor(reWorkWorkSetQueryDTO?: ReWorkWorkSetQueryDTO) {
    super(reWorkWorkSetQueryDTO)
    if (NotNullish(reWorkWorkSetQueryDTO)) {
      this.workId = reWorkWorkSetQueryDTO.workId
      this.workSetId = reWorkWorkSetQueryDTO.workSetId
      this.sortOrder = reWorkWorkSetQueryDTO.sortOrder
    }
    // 默认按 sortOrder 升序排序
    if (!this.sort) {
      this.sort = [{ key: 'sort_order', asc: true }]
    }
  }
}
