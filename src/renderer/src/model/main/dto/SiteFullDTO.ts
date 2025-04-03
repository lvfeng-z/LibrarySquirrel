import Site from '../entity/Site.js'
import SiteDomain from '../entity/SiteDomain.js'
import lodash from 'lodash'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

/**
 * 站点-dto
 */
export default class SiteFullDTO extends Site {
  /**
   * 站点域名
   */
  domains: SiteDomain[] | undefined | null

  constructor(site?: Site) {
    super(site)
    if (NotNullish(site)) {
      lodash.assign(this, lodash.pick(site, ['domains']))
    }
  }
}
