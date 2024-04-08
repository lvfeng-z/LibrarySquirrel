/**
 * 站点作者
 */

export default class AuthorSite {
  id: string
  siteId: number
  siteAuthorId: string
  siteAuthorName: string
  introduce: string
  localAuthorId: number
  constructor(
    id: string,
    siteId: number,
    siteAuthorId: string,
    siteAuthorName: string,
    introduce: string,
    localAuthorId: number
  ) {
    this.id = id
    this.siteId = siteId
    this.siteAuthorId = siteAuthorId
    this.siteAuthorName = siteAuthorName
    this.introduce = introduce
    this.localAuthorId = localAuthorId
  }
}
