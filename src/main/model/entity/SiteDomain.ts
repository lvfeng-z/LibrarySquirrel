import BaseEntity from '../../base/BaseEntity.js'
import { NotNullish } from '../../util/CommonUtil.js'

/**
 * 站点域名
 */
export default class SiteDomain extends BaseEntity {
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
    if (NotNullish(siteDomain)) {
      this.siteId = siteDomain.siteId
      this.domain = siteDomain.domain
      this.homepage = siteDomain.homepage
    }
  }
}
