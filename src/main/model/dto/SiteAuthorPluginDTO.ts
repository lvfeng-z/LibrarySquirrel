import SiteAuthor from '../entity/SiteAuthor.ts'
import { NotNullish } from '../../util/CommonUtil.js'
import lodash from 'lodash'

/**
 * 站点作者DTO
 */
export default class SiteAuthorPluginDTO extends SiteAuthor {
  /**
   * 来源站点的实例
   */
  siteDomain: string | undefined | null

  constructor(siteAuthor?: SiteAuthor) {
    super(siteAuthor)
    if (NotNullish(siteAuthor)) {
      lodash.assign(this, lodash.pick(siteAuthor, ['siteDomain']))
    }
  }
}
