/**
 * 作品-标签关联表
 */
export default class ReWorksTag {
  id: string
  worksId: number
  tagId: string
  tagType: boolean
  tagSiteId: number
  createTime: string
  constructor(
    id: string,
    worksId: number,
    tagId: string,
    tagType: boolean,
    tagSiteId: number,
    createTime: string
  ) {
    this.id = id
    this.worksId = worksId
    this.tagId = tagId
    this.tagType = tagType
    this.tagSiteId = tagSiteId
    this.createTime = createTime
  }
}
