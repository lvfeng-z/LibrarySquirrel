import SiteAuthor from '../entity/SiteAuthor.ts'
import LocalAuthor from '../entity/LocalAuthor.ts'
import { AuthorRole } from '../../constant/AuthorRole.ts'
import Site from '../entity/Site.ts'

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

  constructor(siteAuthor?: SiteAuthor) {
    super(siteAuthor)
    if (siteAuthor === undefined) {
      this.localAuthor = undefined
      this.site = undefined
      this.authorRole = undefined
    } else {
      this.localAuthor = siteAuthor['localAuthor']
      if (typeof siteAuthor['site'] == 'string') {
        this.site = JSON.parse(siteAuthor['site'])
      } else {
        this.site = siteAuthor['site']
      }
      this.authorRole = siteAuthor['authorRole']
    }
  }
}
