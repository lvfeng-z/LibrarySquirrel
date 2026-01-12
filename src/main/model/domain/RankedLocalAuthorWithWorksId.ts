import { IsNullish } from '../../util/CommonUtil.ts'
import RankedLocalAuthor from './RankedLocalAuthor.ts'

export default class RankedLocalAuthorWithWorksId extends RankedLocalAuthor {
  /**
   * 作者级别
   */
  worksId: number | undefined | null

  constructor(rankedLocalAuthorWithWorksId?: RankedLocalAuthorWithWorksId) {
    if (IsNullish(rankedLocalAuthorWithWorksId)) {
      super()
      this.worksId = undefined
    } else {
      super(rankedLocalAuthorWithWorksId)
      this.worksId = rankedLocalAuthorWithWorksId.worksId
    }
  }
}
