/**
 * 站点标签
 */

export default class SiteTag {
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
  constructor(siteTag: SiteTag) {
    this.id = siteTag.id
    this.siteId = siteTag.siteId
    this.siteTagId = siteTag.siteTagId
    this.siteTagName = siteTag.siteTagName
    this.baseSiteTagId = siteTag.baseSiteTagId
    this.description = siteTag.description
    this.localTagId = siteTag.localTagId
  }
}
