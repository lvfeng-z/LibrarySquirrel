import LocalAuthor from '../entity/LocalAuthor.ts'
import { AuthorRole } from '../../constant/AuthorRole.ts'
import { IsNullish } from '../../util/CommonUtil.ts'

export default class LocalAuthorDTO extends LocalAuthor {
  /**
   * 作者角色
   */
  authorRole: AuthorRole | undefined | null

  constructor(localAuthorDTO?: LocalAuthorDTO) {
    if (IsNullish(localAuthorDTO)) {
      super()
      this.authorRole = undefined
    } else {
      super(localAuthorDTO)
      this.authorRole = localAuthorDTO.authorRole
    }
  }
}
