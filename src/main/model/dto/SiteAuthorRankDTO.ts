import SiteAuthor from '../entity/SiteAuthor.js'
import { AuthorRank } from '../../constant/AuthorRank.js'
import { NotNullish } from '../../util/CommonUtil.js'
import RankAuthor from '../interface/RankAuthor.js'

/**
 * 站点作者DTO
 */
export default class SiteAuthorRankDTO extends SiteAuthor implements RankAuthor {
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
