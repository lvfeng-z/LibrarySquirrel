import { BaseQueryDTO } from '../../base/BaseQueryDTO.js'

/**
 * QueryDTO
 * 站点作者
 */
export default class SiteAuthorQueryDTO extends BaseQueryDTO {
  /**
   * 作者来源站点id
   */
  siteId?: number | undefined | null
  /**
   * 站点中作者的id
   */
  siteAuthorId?: string | undefined | null
  /**
   * 站点中作者的名称
   */
  siteAuthorName?: string | undefined | null
  /**
   * 站点中作者的曾用名
   */
  siteAuthorNameBefore?: string[] | undefined | null
  /**
   * 介绍
   */
  introduce?: string | undefined | null
  /**
   * 站点作者在本地对应的作者id
   */
  localAuthorId?: number | undefined | null

  // 查询用字段
  /**
   * 标签来源站点id列表
   */
  sites?: string[] | undefined | null

  /**
   * 查询绑定在LocalAuthor上的，还是未绑定的（true：绑定的，false：未绑定的）
   */
  boundOnLocalAuthorId?: boolean | undefined | null

  constructor(siteAuthorQueryDTO?: SiteAuthorQueryDTO) {
    if (siteAuthorQueryDTO === undefined) {
      super()
      this.siteId = undefined
      this.siteAuthorId = undefined
      this.siteAuthorName = undefined
      this.siteAuthorNameBefore = undefined
      this.introduce = undefined
      this.localAuthorId = undefined
      this.sites = undefined
      this.boundOnLocalAuthorId = undefined
    } else {
      super(siteAuthorQueryDTO)
      this.siteId = siteAuthorQueryDTO.siteId
      this.siteAuthorId = siteAuthorQueryDTO.siteAuthorId
      this.siteAuthorName = siteAuthorQueryDTO.siteAuthorName
      this.siteAuthorNameBefore = siteAuthorQueryDTO.siteAuthorNameBefore
      this.introduce = siteAuthorQueryDTO.introduce
      this.localAuthorId = siteAuthorQueryDTO.localAuthorId
      this.sites = siteAuthorQueryDTO.sites
      this.boundOnLocalAuthorId = siteAuthorQueryDTO.boundOnLocalAuthorId
    }
  }
}
