import LocalAuthor from '../entity/LocalAuthor.ts'
import { IsNullish } from '../../../utils/CommonUtil'
import { AuthorRank } from '../../../constants/AuthorRank.ts'
import RankAuthor from '@renderer/model/main/interface/RankAuthor.ts'

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
