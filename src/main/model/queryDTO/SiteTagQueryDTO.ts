/**
 * QueryDTO
 * 站点标签
 */
import { BaseQueryDTO } from './BaseQueryDTO'

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
  bound?: boolean | undefined | null

  constructor(siteTagQueryDTO: SiteTagQueryDTO) {
    super(siteTagQueryDTO)
    this.id = siteTagQueryDTO.id
    this.siteId = siteTagQueryDTO.siteId
    this.siteTagId = siteTagQueryDTO.siteTagId
    this.siteTagName = siteTagQueryDTO.siteTagName
    this.baseSiteTagId = siteTagQueryDTO.baseSiteTagId
    this.description = siteTagQueryDTO.description
    this.localTagId = siteTagQueryDTO.localTagId
    this.sites = siteTagQueryDTO.sites
    this.bound = siteTagQueryDTO.bound
  }
}
