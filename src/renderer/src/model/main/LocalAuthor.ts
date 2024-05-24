/**
 * 本地作者
 */

export default class LocalAuthor {
  /**
   * 主键
   */
  id: string | undefined | null

  /**
   * 作者名称
   */
  localAuthorName: string | undefined | null

  constructor(localAuthor?: LocalAuthor) {
    if (localAuthor === undefined || localAuthor === null) {
      this.id = undefined
      this.localAuthorName = undefined
    } else {
      this.id = localAuthor.id
      this.localAuthorName = localAuthor.localAuthorName
    }
  }
}
