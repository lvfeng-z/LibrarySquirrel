import SiteDomain from '../entity/SiteDomain.js'
import Site from '../entity/Site.js'
import lodash from 'lodash'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

export default class SiteDomainDTO extends SiteDomain {
  /**
   * 站点
   */
  site: Site | undefined | null

  constructor(siteDomain?: SiteDomain) {
    super(siteDomain)
    if (NotNullish(siteDomain)) {
      lodash.assign(this, lodash.pick(siteDomain, ['site']))
    }
  }
}
