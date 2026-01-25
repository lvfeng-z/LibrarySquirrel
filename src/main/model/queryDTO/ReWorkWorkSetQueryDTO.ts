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

  constructor(reWorkWorkSetQueryDTO?: ReWorkWorkSetQueryDTO) {
    super(reWorkWorkSetQueryDTO)
    if (NotNullish(reWorkWorkSetQueryDTO)) {
      this.workId = reWorkWorkSetQueryDTO.workId
      this.workSetId = reWorkWorkSetQueryDTO.workSetId
    }
  }
}
