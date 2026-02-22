import Site from '../entity/Site.ts'
import SiteDomain from '../entity/SiteDomain.ts'
import { NotNullish } from '../../util/CommonUtil.ts'
import lodash from 'lodash'

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
