/**
 * QueryDTO
 * 站点标签
 */
import BaseQueryDTO from './BaseQueryDTO.ts'

export default class SiteQueryDTO extends BaseQueryDTO {
  /**
   * 主键
   */
  id: string | undefined | null
  /**
   * 站点名称
   */
  siteName: string | undefined | null
  /**
   * 站点域名
   */
  siteDomain: string | undefined | null
  /**
   * 站点主页
   */
  siteHomepage: string | undefined | null

  constructor(siteQueryDTO: SiteQueryDTO) {
    super(siteQueryDTO)
    this.id = siteQueryDTO.id
    this.siteName = siteQueryDTO.siteName
    this.siteDomain = siteQueryDTO.siteDomain
    this.siteHomepage = siteQueryDTO.siteHomepage
  }
}
