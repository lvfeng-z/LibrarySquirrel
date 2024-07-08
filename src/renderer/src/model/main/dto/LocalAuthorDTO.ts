import LocalAuthor from '../LocalAuthor.ts'
import { isNullish } from '../../../utils/CommonUtil'
import { AuthorRole } from '../../../constants/AuthorRole'

export default class LocalAuthorDTO extends LocalAuthor {
  /**
   * 作者角色
   */
  authorRole: AuthorRole | undefined | null

  constructor(localAuthorDTO?: LocalAuthorDTO) {
    if (isNullish(localAuthorDTO)) {
      super()
      this.authorRole = undefined
    } else {
      super(localAuthorDTO)
      this.authorRole = localAuthorDTO.authorRole
    }
  }
}
