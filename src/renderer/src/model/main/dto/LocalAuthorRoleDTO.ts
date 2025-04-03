import LocalAuthor from '../entity/LocalAuthor.ts'
import { IsNullish } from '../../../utils/CommonUtil'
import { AuthorRole } from '../../../constants/AuthorRole'

export default class LocalAuthorRoleDTO extends LocalAuthor {
  /**
   * 作者角色
   */
  authorRole: AuthorRole | undefined | null

  constructor(localAuthorRoleDTO?: LocalAuthorRoleDTO) {
    if (IsNullish(localAuthorRoleDTO)) {
      super()
      this.authorRole = undefined
    } else {
      super(localAuthorRoleDTO)
      this.authorRole = localAuthorRoleDTO.authorRole
    }
  }
}
