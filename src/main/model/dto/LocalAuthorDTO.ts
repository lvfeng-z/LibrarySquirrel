import LocalAuthor from '../LocalAuthor.ts'
import { AuthorRole } from '../../constant/AuthorRole.ts'

export default class LocalAuthorDTO extends LocalAuthor {
  /**
   * 作者角色
   */
  authorRole: AuthorRole | undefined | null

  constructor(localAuthorDTO?: LocalAuthorDTO) {
    if (localAuthorDTO === undefined || localAuthorDTO === null) {
      super()
      this.authorRole = undefined
    } else {
      super(localAuthorDTO)
      this.authorRole = localAuthorDTO.authorRole
    }
  }
}
