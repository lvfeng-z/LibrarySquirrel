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

  /**
   * 排序号
   */
  sortNum: number | undefined | null

  constructor(siteQueryDTO?: SiteQueryDTO) {
    if (siteQueryDTO === undefined) {
      super()
      this.id = undefined
      this.siteName = undefined
      this.siteDomain = undefined
      this.siteHomepage = undefined
      this.sortNum = undefined
    } else {
      super(siteQueryDTO)
      this.id = siteQueryDTO.id
      this.siteName = siteQueryDTO.siteName
      this.siteDomain = siteQueryDTO.siteDomain
      this.siteHomepage = siteQueryDTO.siteHomepage
      this.sortNum = siteQueryDTO.sortNum
    }
  }
}
