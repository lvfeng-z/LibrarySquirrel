/**
 * 站点标签
 */

export default class TagSite {
  id: number
  siteId: number
  siteTagId: string
  siteTagName: string
  baseSiteTagId: string
  description: string
  localTagId: number
  constructor(
    id: number,
    siteId: number,
    siteTagId: string,
    siteTagName: string,
    baseSiteTagId: string,
    description: string,
    localTagId: number
  ) {
    this.id = id
    this.siteId = siteId
    this.siteTagId = siteTagId
    this.siteTagName = siteTagName
    this.baseSiteTagId = baseSiteTagId
    this.description = description
    this.localTagId = localTagId
  }
}
