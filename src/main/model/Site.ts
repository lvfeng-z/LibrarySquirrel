import BaseModel from './BaseModel'

/**
 * 站点
 */
export default class Site extends BaseModel {
  /**
   * 主键
   */
  id: string | undefined | null
  /**
   * 站点名称
   */
  siteName: string | undefined | null
  /**
   * 站点域名
   */
  siteDomain: string | undefined | null
  /**
   * 站点主页
   */
  siteHomepage: string | undefined | null

  constructor(site: Site) {
    super(site)
    this.id = site.id
    this.siteName = site.siteName
    this.siteDomain = site.siteDomain
    this.siteHomepage = site.siteHomepage
  }
}
