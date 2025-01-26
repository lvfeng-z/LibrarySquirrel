import { BaseQueryDTO } from '../../base/BaseQueryDTO.js'

/**
 * 作品-作品集关联表QueryDTO
 */
export default class ReWorksWorksSetQueryDTO extends BaseQueryDTO {
  /**
   * 主键
   */
  id: number | undefined | null
  /**
   * 作品id
   */
  worksId: number | undefined | null
  /**
   * 作品集id
   */
  worksSetId: number | undefined | null

  constructor(reWorksWorksSetQueryDTO?: ReWorksWorksSetQueryDTO) {
    if (reWorksWorksSetQueryDTO === undefined) {
      super()
      this.id = undefined
      this.worksId = undefined
      this.worksSetId = undefined
    } else {
      super(reWorksWorksSetQueryDTO)
      this.id = reWorksWorksSetQueryDTO.id
      this.worksId = reWorksWorksSetQueryDTO.worksId
      this.worksSetId = reWorksWorksSetQueryDTO.worksSetId
    }
  }
}
