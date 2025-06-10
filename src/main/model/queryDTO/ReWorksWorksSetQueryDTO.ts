import BaseQueryDTO from '../../base/BaseQueryDTO.js'
import { NotNullish } from '../../util/CommonUtil.js'

/**
 * 作品-作品集关联表QueryDTO
 */
export default class ReWorksWorksSetQueryDTO extends BaseQueryDTO {
  /**
   * 作品id
   */
  worksId: number | undefined | null
  /**
   * 作品集id
   */
  worksSetId: number | undefined | null

  constructor(reWorksWorksSetQueryDTO?: ReWorksWorksSetQueryDTO) {
    super(reWorksWorksSetQueryDTO)
    if (NotNullish(reWorksWorksSetQueryDTO)) {
      this.worksId = reWorksWorksSetQueryDTO.worksId
      this.worksSetId = reWorksWorksSetQueryDTO.worksSetId
    }
  }
}
