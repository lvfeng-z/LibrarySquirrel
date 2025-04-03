import SiteAuthor from '@renderer/model/main/entity/SiteAuthor.ts'
import { AuthorRole } from '@renderer/constants/AuthorRole.ts'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

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
