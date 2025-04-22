import SiteAuthor from '@renderer/model/main/entity/SiteAuthor.ts'
import { AuthorRank } from '@renderer/constants/AuthorRank.ts'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

/**
 * 站点作者DTO
 */
export default class SiteAuthorRankDTO extends SiteAuthor {
  /**
   * 作者级别
   */
  authorRank: AuthorRank | undefined | null

  constructor(siteAuthorDTO?: SiteAuthor) {
    super(siteAuthorDTO)
    if (NotNullish(siteAuthorDTO)) {
      this.authorRank = siteAuthorDTO['authorRank']
    }
  }
}
