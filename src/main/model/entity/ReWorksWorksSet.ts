import BaseEntity from '../../base/BaseEntity.ts'
import { NotNullish } from '../../util/CommonUtil.js'

/**
 * 作品-作品集关联表
 */
export default class ReWorksWorksSet extends BaseEntity {
  /**
   * 作品id
   */
  worksId: number | undefined | null
  /**
   * 作品集id
   */
  worksSetId: number | undefined | null

  constructor(reWorksWorksSet?: ReWorksWorksSet) {
    super(reWorksWorksSet)
    if (NotNullish(reWorksWorksSet)) {
      this.worksId = reWorksWorksSet.worksId
      this.worksSetId = reWorksWorksSet.worksSetId
    }
  }
}
