import SiteAuthor from '../entity/SiteAuthor.js'
import { AuthorRole } from '../../constant/AuthorRole.js'
import { NotNullish } from '../../util/CommonUtil.js'

/**
 * 站点作者DTO
 */
export default class SiteAuthorRoleDTO extends SiteAuthor {
  /**
   * 作者角色
   */
  authorRole: AuthorRole | undefined | null

  constructor(siteAuthorDTO?: SiteAuthor) {
    super(siteAuthorDTO)
    if (NotNullish(siteAuthorDTO)) {
      this.authorRole = siteAuthorDTO['authorRole']
    }
  }
}
