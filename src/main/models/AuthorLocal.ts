/**
 * 本地作者
 */

export default class AuthorLocal {
  /**
   * 主键
   */
  id: string

  /**
   * 作者名称
   */
  localAuthorName: string
  constructor(authorLocal: AuthorLocal) {
    this.id = authorLocal.id
    this.localAuthorName = authorLocal.localAuthorName
  }
}
