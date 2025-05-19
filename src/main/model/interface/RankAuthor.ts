import BaseAuthor from './BaseAuthor.js'
import { AuthorRank } from '../../constant/AuthorRank.js'

export default interface RankAuthor extends BaseAuthor {
  /**
   * 作者级别
   */
  authorRank: AuthorRank | undefined | null
}
