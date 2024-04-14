/**
 * 作品-标签关联表
 */
export default class ReWorksTag {
  /**
   * 主键
   */
  id: string
  /**
   * 作品id
   */
  worksId: number
  /**
   * 标签id
   */
  tagId: string
  /**
   * 标签类型（true：本地，false：站点）
   */
  tagType: boolean
  /**
   * 标签来源站点id
   */
  tagSiteId: number
  /**
   * 创建时间
   */
  createTime: string
  constructor(reWorksTag: ReWorksTag) {
    this.id = reWorksTag.id
    this.worksId = reWorksTag.worksId
    this.tagId = reWorksTag.tagId
    this.tagType = reWorksTag.tagType
    this.tagSiteId = reWorksTag.tagSiteId
    this.createTime = reWorksTag.createTime
  }
}
