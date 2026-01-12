import LocalAuthor from '../entity/LocalAuthor.ts'
import { IsNullish } from '../../../utils/CommonUtil.ts'
import { AuthorRank } from '../../../constants/AuthorRank.ts'
import RankAuthor from '@renderer/model/main/interface/RankAuthor.ts'

export default class RankedLocalAuthor extends LocalAuthor implements RankAuthor {
  /**
   * 作者级别
   */
  authorRank: AuthorRank | undefined | null

  constructor(rankedLocalAuthor?: RankedLocalAuthor) {
    if (IsNullish(rankedLocalAuthor)) {
      super()
      this.authorRank = undefined
    } else {
      super(rankedLocalAuthor)
      this.authorRank = rankedLocalAuthor.authorRank
    }
  }
}
