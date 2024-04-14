/**
 * 站点作者
 */

export default class AuthorSite {
  /**
   * 主键
   */
  id: string
  /**
   * 作者来源站点id
   */
  siteId: number
  /**
   * 站点中作者的id
   */
  siteAuthorId: string
  /**
   * 站点中作者的名称
   */
  siteAuthorName: string
  /**
   * 站点中作者的曾用名
   */
  siteAuthorNameBefore: string[]
  /**
   * 介绍
   */
  introduce: string
  /**
   * 站点作者在本地对应的作者id
   */
  localAuthorId: number
  constructor(authorSite: AuthorSite) {
    this.id = authorSite.id
    this.siteId = authorSite.siteId
    this.siteAuthorId = authorSite.siteAuthorId
    this.siteAuthorName = authorSite.siteAuthorName
    this.siteAuthorNameBefore = authorSite.siteAuthorNameBefore
    this.introduce = authorSite.introduce
    this.localAuthorId = authorSite.localAuthorId
  }
}
