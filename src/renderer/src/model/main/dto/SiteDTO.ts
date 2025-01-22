import Site from '../entity/Site.js'
import SiteDomain from '../entity/SiteDomain.js'
import lodash from 'lodash'
import { IsNullish } from '@renderer/utils/CommonUtil.ts'

/**
 * 站点-dto
 */
export default class SiteDTO extends Site {
  /**
   * 站点域名
   */
  domains: SiteDomain[] | undefined | null

  constructor(site?: Site) {
    super(site)
    if (IsNullish(site)) {
      this.domains = undefined
    } else {
      lodash.assign(this, lodash.pick(site, ['domains']))
    }
  }
}
