import BaseQueryDTO from '../../base/BaseQueryDTO.ts'
import { AuthorRole } from '../../constant/AuthorRole.ts'

export default class ReWorksAuthorQueryDTO extends BaseQueryDTO {
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
  siteAuthorId: string | undefined | null

  /**
   * 作者类型
   */
  authorRole: AuthorRole | undefined | null

  constructor(reWorksAuthorQueryDTO?: ReWorksAuthorQueryDTO) {
    if (reWorksAuthorQueryDTO === undefined) {
      super()
      this.type = undefined
      this.worksId = undefined
      this.localAuthorId = undefined
      this.siteAuthorId = undefined
      this.authorRole = undefined
    } else {
      super(reWorksAuthorQueryDTO)
      this.type = reWorksAuthorQueryDTO.type
      this.worksId = reWorksAuthorQueryDTO.worksId
      this.localAuthorId = reWorksAuthorQueryDTO.localAuthorId
      this.siteAuthorId = reWorksAuthorQueryDTO.siteAuthorId
      this.authorRole = reWorksAuthorQueryDTO.authorRole
    }
  }
}
