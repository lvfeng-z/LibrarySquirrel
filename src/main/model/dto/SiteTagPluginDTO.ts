import SiteTag from '../entity/SiteTag.ts'
import { NotNullish } from '../../util/CommonUtil.ts'
import lodash from 'lodash'

export default class SiteTagPluginDTO extends SiteTag {
  /**
   * 站点域名
   */
  siteDomain: string | undefined | null

  constructor(siteTag?: SiteTag) {
    super(siteTag)
    if (NotNullish(siteTag)) {
      lodash.assign(this, lodash.pick(siteTag, ['siteDomain']))
    }
  }
}
