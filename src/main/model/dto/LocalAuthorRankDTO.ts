import LocalAuthor from '../entity/LocalAuthor.ts'
import { AuthorRank } from '../../constant/AuthorRank.ts'
import { IsNullish } from '../../util/CommonUtil.ts'
import RankAuthor from '../interface/RankAuthor.js'

export default class LocalAuthorRankDTO extends LocalAuthor implements RankAuthor {
  /**
   * 作者级别
   */
  authorRank: AuthorRank | undefined | null

  constructor(localAuthorRankDTO?: LocalAuthorRankDTO) {
    if (IsNullish(localAuthorRankDTO)) {
      super()
      this.authorRank = undefined
    } else {
      super(localAuthorRankDTO)
      this.authorRank = localAuthorRankDTO.authorRank
    }
  }
}
