import { BaseQueryDTO } from '../../base/BaseQueryDTO.js'
import { AuthorRole } from '../../constant/AuthorRole.ts'
import { NotNullish } from '../../util/CommonUtil.js'

export default class ReWorksAuthorQueryDTO extends BaseQueryDTO {
  /**
   * 类型(0: 本地作者，1: 站点作者)
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
  siteAuthorId: string | undefined | null

  /**
   * 作者类型
   */
  authorRole: AuthorRole | undefined | null

  constructor(reWorksAuthorQueryDTO?: ReWorksAuthorQueryDTO) {
    super(reWorksAuthorQueryDTO)
    if (NotNullish(reWorksAuthorQueryDTO)) {
      this.authorType = reWorksAuthorQueryDTO.authorType
      this.worksId = reWorksAuthorQueryDTO.worksId
      this.localAuthorId = reWorksAuthorQueryDTO.localAuthorId
      this.siteAuthorId = reWorksAuthorQueryDTO.siteAuthorId
      this.authorRole = reWorksAuthorQueryDTO.authorRole
    }
  }
}
