import SiteAuthor from '../entity/SiteAuthor.ts'
import LocalAuthor from '../entity/LocalAuthor.ts'
import { AuthorRole } from '../../../constants/AuthorRole'

/**
 * 站点作者DTO
 */
export default class SiteAuthorDTO extends SiteAuthor {
  /**
   * 本地作者
   */
  localAuthor: LocalAuthor | undefined | null

  /**
   * 作者角色
   */
  authorRole: AuthorRole | undefined | null

  constructor(siteAuthorDTO?: SiteAuthorDTO) {
    if (siteAuthorDTO === undefined) {
      super()
      this.localAuthor = undefined
      this.authorRole = undefined
    } else {
      super(siteAuthorDTO)
      this.localAuthor = siteAuthorDTO.localAuthor
      this.authorRole = siteAuthorDTO.authorRole
    }
  }
}
