/**
 * 站点作者
 */

export default class SiteAuthor {
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
  constructor(siteAuthor: SiteAuthor) {
    this.id = siteAuthor.id
    this.siteId = siteAuthor.siteId
    this.siteAuthorId = siteAuthor.siteAuthorId
    this.siteAuthorName = siteAuthor.siteAuthorName
    this.siteAuthorNameBefore = siteAuthor.siteAuthorNameBefore
    this.introduce = siteAuthor.introduce
    this.localAuthorId = siteAuthor.localAuthorId
  }
}
