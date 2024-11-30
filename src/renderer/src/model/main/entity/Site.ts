import BaseEntity from './BaseEntity.ts'

/**
 * 站点
 */
export default class Site extends BaseEntity {
  /**
   * 主键
   */
  id: number | undefined | null
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

  constructor(site?: Site) {
    if (site === undefined) {
      super()
      this.id = undefined
      this.siteName = undefined
      this.siteDomain = undefined
      this.siteHomepage = undefined
      this.sortNum = undefined
    } else {
      super(site)
      this.id = site.id
      this.siteName = site.siteName
      this.siteDomain = site.siteDomain
      this.siteHomepage = site.siteHomepage
      this.sortNum = site.sortNum
    }
  }
}
