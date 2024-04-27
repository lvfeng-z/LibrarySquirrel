/**
 * 站点
 */
export default class Site {
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
    this.id = site.id
    this.siteName = site.siteName
    this.siteDomain = site.siteDomain
    this.siteHomepage = site.siteHomepage
  }
}
