import BaseEntity from '../../base/BaseEntity.ts'
import { NotNullish } from '../../util/CommonUtil.js'

/**
 * 作品-标签关联表
 */
export default class ReWorkTag extends BaseEntity {
  /**
   * 作品id
   */
  workId: number | undefined | null
  /**
   * 标签类型（0：本地，1：站点）
   */
  tagType: number | undefined | null
  /**
   * 本地标签id
   */
  localTagId: number | undefined | null
  /**
   * 站点标签id
   */
  siteTagId: number | undefined | null

  constructor(reWorkTag?: ReWorkTag) {
    super(reWorkTag)
    if (NotNullish(reWorkTag)) {
      this.workId = reWorkTag.workId
      this.tagType = reWorkTag.tagType
      this.localTagId = reWorkTag.localTagId
      this.siteTagId = reWorkTag.siteTagId
    }
  }
}
