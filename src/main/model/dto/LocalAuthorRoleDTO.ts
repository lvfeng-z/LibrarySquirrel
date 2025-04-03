import LocalAuthor from '../entity/LocalAuthor.ts'
import { AuthorRole } from '../../constant/AuthorRole.ts'
import { IsNullish } from '../../util/CommonUtil.ts'

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
