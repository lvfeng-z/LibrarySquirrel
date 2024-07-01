import BaseModel from './BaseModel.ts'

/**
 * 站点作者
 */
export default class SiteAuthor extends BaseModel {
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
  siteAuthorNameBefore: string[] | string | undefined | null
  /**
   * 介绍
   */
  introduce: string | undefined | null
  /**
   * 站点作者在本地对应的作者id
   */
  localAuthorId: number | undefined | null

  constructor(siteAuthor?: SiteAuthor) {
    if (siteAuthor === undefined) {
      super()
      this.siteId = undefined
      this.siteAuthorId = undefined
      this.siteAuthorName = undefined
      this.siteAuthorNameBefore = undefined
      this.introduce = undefined
      this.localAuthorId = undefined
    } else {
      super(siteAuthor)
      this.siteId = siteAuthor.siteId
      this.siteAuthorId = siteAuthor.siteAuthorId
      this.siteAuthorName = siteAuthor.siteAuthorName
      if (typeof siteAuthor.siteAuthorNameBefore === 'string') {
        this.siteAuthorNameBefore = siteAuthor.siteAuthorNameBefore.split(',')
      } else {
        this.siteAuthorNameBefore = siteAuthor.siteAuthorNameBefore
      }
      this.introduce = siteAuthor.introduce
      this.localAuthorId = siteAuthor.localAuthorId
    }
  }
}
