import BaseQueryDTO from './BaseQueryDTO.ts'

/**
 * QueryDTO
 * 站点作者
 */
export default class SiteAuthorQueryDTO extends BaseQueryDTO {
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

  constructor(siteAuthorQueryDTO?: SiteAuthorQueryDTO) {
    if (siteAuthorQueryDTO === undefined) {
      super()
      this.siteId = undefined
      this.siteAuthorId = undefined
      this.siteAuthorName = undefined
      this.siteAuthorNameBefore = undefined
      this.introduce = undefined
      this.localAuthorId = undefined
    } else {
      super(siteAuthorQueryDTO)
      this.siteId = siteAuthorQueryDTO.siteId
      this.siteAuthorId = siteAuthorQueryDTO.siteAuthorId
      this.siteAuthorName = siteAuthorQueryDTO.siteAuthorName
      this.siteAuthorNameBefore = siteAuthorQueryDTO.siteAuthorNameBefore
      this.introduce = siteAuthorQueryDTO.introduce
      this.localAuthorId = siteAuthorQueryDTO.localAuthorId
    }
  }
}
