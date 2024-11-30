import BaseEntity from './BaseEntity.ts'
import { AuthorRole } from '../../constant/AuthorRole.ts'

export default class ReWorksAuthor extends BaseEntity {
  /**
   * 类型(true: 本地作者，false: 站点作者)
   */
  type: number | undefined | null

  /**
   * 作品id
   */
  worksId: number | undefined | null

  /**
   * 本地作者id
   */
  localAuthorId: number | undefined | null

  /**
   * 站点作者Id
   */
  siteAuthorId: number | undefined | null

  /**
   * 作者类型
   */
  authorRole: AuthorRole | undefined | null

  constructor(reWorksAuthor?: ReWorksAuthor) {
    if (reWorksAuthor === undefined) {
      super()
      this.type = undefined
      this.worksId = undefined
      this.localAuthorId = undefined
      this.siteAuthorId = undefined
      this.authorRole = undefined
    } else {
      super(reWorksAuthor)
      this.type = reWorksAuthor.type
      this.worksId = reWorksAuthor.worksId
      this.localAuthorId = reWorksAuthor.localAuthorId
      this.siteAuthorId = reWorksAuthor.siteAuthorId
      this.authorRole = reWorksAuthor.authorRole
    }
  }
}
