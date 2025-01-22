import Site from '../entity/Site.js'
import SiteDomain from '../entity/SiteDomain.js'
import { NotNullish } from '../../util/CommonUtil.js'
import lodash from 'lodash'

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
    if (NotNullish(site)) {
      lodash.assign(this, lodash.pick(site, ['domains']))
    }
  }
}
