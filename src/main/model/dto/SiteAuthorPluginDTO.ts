import SiteAuthor from '../entity/SiteAuthor.ts'
import { NotNullish } from '../../util/CommonUtil.js'
import lodash from 'lodash'
import { AuthorRank } from '../../constant/AuthorRank.js'

/**
 * 站点作者DTO
 */
export default class SiteAuthorPluginDTO extends SiteAuthor {
  /**
   * 来源站点的域名
   */
  siteDomain: string | undefined | null

  /**
   * 作者级别
   */
  authorRank: AuthorRank | undefined | null

  constructor(siteAuthor?: SiteAuthor) {
    super(siteAuthor)
    if (NotNullish(siteAuthor)) {
      lodash.assign(this, lodash.pick(siteAuthor, ['siteDomain', 'authorRank']))
    }
  }
}
