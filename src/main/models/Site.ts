/**
 * 站点
 */
export default class Site {
  id: string
  site_name: string
  site_domain: string
  site_homepage: string
  constructor(id: string, site_name: string, site_domain: string, site_homepage: string) {
    this.id = id
    this.site_name = site_name
    this.site_domain = site_domain
    this.site_homepage = site_homepage
  }
}
