import BaseEntity from './BaseEntity.ts'
import { AuthorRole } from '../../constant/AuthorRole.ts'

export default class ReWorksAuthor extends BaseEntity {
  /**
   * 作者类型（0：本地，1：站点）
   */
  authorType: number | undefined | null

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
      this.authorType = undefined
      this.worksId = undefined
      this.localAuthorId = undefined
      this.siteAuthorId = undefined
      this.authorRole = undefined
    } else {
      super(reWorksAuthor)
      this.authorType = reWorksAuthor.authorType
      this.worksId = reWorksAuthor.worksId
      this.localAuthorId = reWorksAuthor.localAuthorId
      this.siteAuthorId = reWorksAuthor.siteAuthorId
      this.authorRole = reWorksAuthor.authorRole
    }
  }
}
