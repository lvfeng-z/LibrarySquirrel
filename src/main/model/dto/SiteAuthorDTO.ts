import SiteAuthor from '../SiteAuthor.ts'
import LocalAuthor from '../LocalAuthor.ts'

/**
 * 站点作者DTO
 */
export default class SiteAuthorDTO extends SiteAuthor {
  /**
   * 本地作者
   */
  localAuthor: LocalAuthor | undefined | null

  constructor(siteAuthorDTO?: SiteAuthorDTO) {
    if (siteAuthorDTO === undefined) {
      super()
      this.localAuthor = undefined
    } else {
      super(siteAuthorDTO)
      this.localAuthor = siteAuthorDTO.localAuthor
    }
  }
}
