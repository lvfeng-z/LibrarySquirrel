/**
 * 站点
 */
export default class Site {
  id: string
  siteName: string
  siteDomain: string
  siteHomepage: string
  constructor(id: string, siteName: string, siteDomain: string, siteHomepage: string) {
    this.id = id
    this.siteName = siteName
    this.siteDomain = siteDomain
    this.siteHomepage = siteHomepage
  }
}
