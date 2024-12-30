import BaseQueryDTO from './BaseQueryDTO.ts'

/**
 * QueryDTO
 * 站点标签
 */
export default class SiteTagQueryDTO extends BaseQueryDTO {
  /**
   * 标签来源站点id
   */
  siteId?: number | undefined | null
  /**
   * 站点中标签的id
   */
  siteTagId?: string | undefined | null
  /**
   * 站点中标签的名称
   */
  siteTagName?: string | undefined | null
  /**
   * 上级标签id
   */
  baseSiteTagId?: string | undefined | null
  /**
   * 描述
   */
  description?: string | undefined | null
  /**
   * 站点标签对应的本地标签id
   */
  localTagId?: number | undefined | null

  // 查询用字段
  /**
   * 标签来源站点id列表
   */
  sites?: string[] | undefined | null

  /**
   * 查询绑定在localTagId上的，还是未绑定的（true：绑定的，false：未绑定的）
   */
  boundOnLocalTagId?: boolean | undefined | null

  /**
   * 作品id
   */
  worksId?: number | null | undefined

  /**
   * 查询绑定在localTagId上的，还是未绑定的（true：绑定的，false：未绑定的）
   */
  boundOnWorksId?: boolean | undefined | null

  constructor(siteTagQueryDTO?: SiteTagQueryDTO) {
    if (siteTagQueryDTO === undefined) {
      super()
      this.siteId = undefined
      this.siteTagId = undefined
      this.siteTagName = undefined
      this.baseSiteTagId = undefined
      this.description = undefined
      this.localTagId = undefined
      this.sites = undefined
      this.boundOnLocalTagId = undefined
    } else {
      super(siteTagQueryDTO)
      this.siteId = siteTagQueryDTO.siteId
      this.siteTagId = siteTagQueryDTO.siteTagId
      this.siteTagName = siteTagQueryDTO.siteTagName
      this.baseSiteTagId = siteTagQueryDTO.baseSiteTagId
      this.description = siteTagQueryDTO.description
      this.localTagId = siteTagQueryDTO.localTagId
      this.sites = siteTagQueryDTO.sites
      this.boundOnLocalTagId = siteTagQueryDTO.boundOnLocalTagId
    }
  }
}
