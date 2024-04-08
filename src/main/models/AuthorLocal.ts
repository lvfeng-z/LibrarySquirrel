/**
 * 本地作者
 */

export default class AuthorLocal {
  id: string
  localAuthorName: string //作者名称
  constructor(id: string, localAuthorName: string) {
    this.id = id
    this.localAuthorName = localAuthorName
  }
}
