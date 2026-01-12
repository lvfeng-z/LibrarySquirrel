import LocalAuthor from '../entity/LocalAuthor.ts'
import { AuthorRank } from '../../constant/AuthorRank.ts'
import { IsNullish } from '../../util/CommonUtil.ts'
import RankAuthor from '../interface/RankAuthor.ts'

export default class RankedLocalAuthor extends LocalAuthor implements RankAuthor {
  /**
   * 作者级别
   */
  authorRank: AuthorRank | undefined | null

  constructor(localAuthorRankDTO?: RankedLocalAuthor) {
    if (IsNullish(localAuthorRankDTO)) {
      super()
      this.authorRank = undefined
    } else {
      super(localAuthorRankDTO)
      this.authorRank = localAuthorRankDTO.authorRank
    }
  }
}
