import BaseModel from './BaseModel.ts'

/**
 * 站点作者
 */
export default class SiteAuthor extends BaseModel {
  /**
   * 主键
   */
  id: string | undefined | null
  /**
   * 作者来源站点id
   */
  siteId: number | undefined | null
  /**
   * 站点中作者的id
   */
  siteAuthorId: string | undefined | null
  /**
   * 站点中作者的名称
   */
  siteAuthorName: string | undefined | null
  /**
   * 站点中作者的曾用名
   */
  siteAuthorNameBefore: string[] | undefined | null
  /**
   * 介绍
   */
  introduce: string | undefined | null
  /**
   * 站点作者在本地对应的作者id
   */
  localAuthorId: number | undefined | null

  constructor(siteAuthor: SiteAuthor) {
    super(siteAuthor)
    this.id = siteAuthor.id
    this.siteId = siteAuthor.siteId
    this.siteAuthorId = siteAuthor.siteAuthorId
    this.siteAuthorName = siteAuthor.siteAuthorName
    this.siteAuthorNameBefore = siteAuthor.siteAuthorNameBefore
    this.introduce = siteAuthor.introduce
    this.localAuthorId = siteAuthor.localAuthorId
  }
}
