import SiteAuthor from '../entity/SiteAuthor.ts'
import { NotNullish } from '../../util/CommonUtil.js'
import lodash from 'lodash'
import { AuthorRole } from '../../constant/AuthorRole.js'

/**
 * 站点作者DTO
 */
export default class SiteAuthorPluginDTO extends SiteAuthor {
  /**
   * 来源站点的域名
   */
  siteDomain: string | undefined | null

  /**
   * 作者角色
   */
  authorRole: AuthorRole | undefined | null

  constructor(siteAuthor?: SiteAuthor) {
    super(siteAuthor)
    if (NotNullish(siteAuthor)) {
      lodash.assign(this, lodash.pick(siteAuthor, ['siteDomain']))
    }
  }
}
