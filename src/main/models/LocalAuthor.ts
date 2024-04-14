/**
 * 本地作者
 */

export default class LocalAuthor {
  /**
   * 主键
   */
  id: string

  /**
   * 作者名称
   */
  localAuthorName: string
  constructor(localAuthor: LocalAuthor) {
    this.id = localAuthor.id
    this.localAuthorName = localAuthor.localAuthorName
  }
}
