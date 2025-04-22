import LocalAuthor from '../entity/LocalAuthor.ts'
import { AuthorRank } from '../../constant/AuthorRank.ts'
import { IsNullish } from '../../util/CommonUtil.ts'

export default class LocalAuthorRankDTO extends LocalAuthor {
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
