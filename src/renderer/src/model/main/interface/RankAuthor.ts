import { AuthorRank } from '@renderer/constants/AuthorRank.ts'
import BaseAuthor from '@renderer/model/main/interface/BaseAuthor.ts'

export default interface RankAuthor extends BaseAuthor {
  /**
   * 作者级别
   */
  authorRank: AuthorRank | undefined | null
}
