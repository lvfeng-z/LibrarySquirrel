/**
 * 站点
 */
export default class Site {
  /**
   * 主键
   */
  id: string
  /**
   * 站点名称
   */
  siteName: string
  /**
   * 站点域名
   */
  siteDomain: string
  /**
   * 站点主页
   */
  siteHomepage: string
  constructor(site: Site) {
    this.id = site.id
    this.siteName = site.siteName
    this.siteDomain = site.siteDomain
    this.siteHomepage = site.siteHomepage
  }
}
