import BaseEntity from '../../base/BaseEntity.ts'
import { NotNullish } from '../../util/CommonUtil.js'

/**
 * 作品-作品集关联表
 */
export default class ReWorkWorkSet extends BaseEntity {
  /**
   * 作品id
   */
  workId: number | undefined | null
  /**
   * 作品集id
   */
  workSetId: number | undefined | null

  constructor(reWorkWorkSet?: ReWorkWorkSet) {
    super(reWorkWorkSet)
    if (NotNullish(reWorkWorkSet)) {
      this.workId = reWorkWorkSet.workId
      this.workSetId = reWorkWorkSet.workSetId
    }
  }
}
