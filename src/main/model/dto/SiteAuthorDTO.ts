import SiteAuthor from '../SiteAuthor.ts'
import LocalAuthor from '../LocalAuthor.ts'
import { AuthorRole } from '../../constant/AuthorRole.ts'
import Site from '../Site.ts'

/**
 * 站点作者DTO
 */
export default class SiteAuthorDTO extends SiteAuthor {
  /**
   * 本地作者
   */
  localAuthor: LocalAuthor | undefined | null

  /**
   * 来源站点的实例
   */
  site: Site | undefined | null

  /**
   * 作者角色
   */
  authorRole: AuthorRole | undefined | null

  constructor(siteAuthorDTO?: SiteAuthorDTO) {
    if (siteAuthorDTO === undefined) {
      super()
      this.localAuthor = undefined
      this.site = undefined
      this.authorRole = undefined
    } else {
      super(siteAuthorDTO)
      this.localAuthor = siteAuthorDTO.localAuthor
      this.site = siteAuthorDTO.site
      this.authorRole = siteAuthorDTO.authorRole
    }
  }
}
