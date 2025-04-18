import SiteDomain from '../entity/SiteDomain.js'
import Site from '../entity/Site.js'
import { NotNullish } from '../../util/CommonUtil.js'
import lodash from 'lodash'
import { ParsePropertyFromJson } from '../../util/ObjectUtil.js'

export default class SiteDomainDTO extends SiteDomain {
  /**
   * 站点
   */
  site: Site | undefined | null

  constructor(siteDomain?: SiteDomain) {
    super(siteDomain)
    if (NotNullish(siteDomain)) {
      lodash.assign(this, lodash.pick(siteDomain, ['site']))
      const property = [
        {
          property: 'site',
          builder: (src) => new Site(src)
        }
      ]
      ParsePropertyFromJson(this, property)
    }
  }
}
