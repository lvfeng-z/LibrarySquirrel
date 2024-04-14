/**
 * 站点标签
 */

export default class TagSite {
  /**
   * 主键
   */
  id: number
  /**
   * 标签来源站点id
   */
  siteId: number
  /**
   * 站点中标签的id
   */
  siteTagId: string
  /**
   * 站点中标签的名称
   */
  siteTagName: string
  /**
   * 上级标签id
   */
  baseSiteTagId: string
  /**
   * 描述
   */
  description: string
  /**
   * 站点标签对应的本地标签id
   */
  localTagId: number
  constructor(tagSite: TagSite) {
    this.id = tagSite.id
    this.siteId = tagSite.siteId
    this.siteTagId = tagSite.siteTagId
    this.siteTagName = tagSite.siteTagName
    this.baseSiteTagId = tagSite.baseSiteTagId
    this.description = tagSite.description
    this.localTagId = tagSite.localTagId
  }
}
