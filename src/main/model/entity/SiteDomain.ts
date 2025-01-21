import BaseEntity from './BaseEntity.js'

/**
 * 站点域名
 */
export default class SiteDomain extends BaseEntity {
  /**
   * 主键
   */
  id: number | undefined | null

  /**
   * 站点id
   */
  siteId: number | undefined | null

  /**
   * 域名
   */
  domain: string | undefined | null

  /**
   * 主页
   */
  homepage: string | undefined | null

  constructor(siteDomain?: SiteDomain) {
    super(siteDomain)
    if (siteDomain === undefined) {
      this.id = undefined
      this.siteId = undefined
      this.domain = undefined
      this.homepage = undefined
    } else {
      this.id = siteDomain.id
      this.siteId = siteDomain.siteId
      this.domain = siteDomain.domain
      this.homepage = siteDomain.homepage
    }
  }
}
