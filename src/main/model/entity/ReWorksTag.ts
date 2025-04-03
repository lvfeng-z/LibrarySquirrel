import BaseEntity from '../../base/BaseEntity.ts'
import { NotNullish } from '../../util/CommonUtil.js'

/**
 * 作品-标签关联表
 */
export default class ReWorksTag extends BaseEntity {
  /**
   * 作品id
   */
  worksId: number | undefined | null
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

  constructor(reWorksTag?: ReWorksTag) {
    super(reWorksTag)
    if (NotNullish(reWorksTag)) {
      this.worksId = reWorksTag.worksId
      this.tagType = reWorksTag.tagType
      this.localTagId = reWorksTag.localTagId
      this.siteTagId = reWorksTag.siteTagId
    }
  }
}
