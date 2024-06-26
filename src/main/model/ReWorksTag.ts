import BaseModel from './BaseModel.ts'

/**
 * 作品-标签关联表
 */
export default class ReWorksTag extends BaseModel {
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
    if (reWorksTag === undefined) {
      super()
      this.worksId = undefined
      this.tagType = undefined
      this.localTagId = undefined
      this.siteTagId = undefined
    } else {
      super(reWorksTag)
      this.worksId = reWorksTag.worksId
      this.tagType = reWorksTag.tagType
      this.localTagId = reWorksTag.localTagId
      this.siteTagId = reWorksTag.siteTagId
    }
  }
}
