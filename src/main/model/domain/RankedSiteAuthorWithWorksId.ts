import { NotNullish } from '../../util/CommonUtil.ts'
import RankedSiteAuthor from './RankedSiteAuthor.ts'

/**
 * 站点作者DTO
 */
export default class RankedSiteAuthorWithWorksId extends RankedSiteAuthor {
  /**
   * 作品id
   */
  worksId: number | undefined | null

  constructor(rankedSiteAuthorWithWorksId?: RankedSiteAuthorWithWorksId) {
    super(rankedSiteAuthorWithWorksId)
    if (NotNullish(rankedSiteAuthorWithWorksId)) {
      this.worksId = rankedSiteAuthorWithWorksId['worksId']
    }
  }
}
