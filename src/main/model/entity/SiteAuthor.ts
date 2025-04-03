import BaseEntity from '../../base/BaseEntity.ts'
import { NotNullish } from '../../util/CommonUtil.js'

/**
 * 站点作者
 */
export default class SiteAuthor extends BaseEntity {
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
  /**
   * 最后一次使用的时间
   */
  lastUse: number | null | undefined

  constructor(siteAuthor?: SiteAuthor) {
    super(siteAuthor)
    if (NotNullish(siteAuthor)) {
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
      this.lastUse = siteAuthor.lastUse
    }
  }
}
