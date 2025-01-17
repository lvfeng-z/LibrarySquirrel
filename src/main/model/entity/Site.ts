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
   * 站点描述
   */
  siteDescription: string | undefined | null

  /**
   * 排序号
   */
  sortNum: number | undefined | null

  constructor(site?: Site) {
    super(site)
    if (site === undefined) {
      super()
      this.id = undefined
      this.siteName = undefined
      this.siteDescription = undefined
      this.sortNum = undefined
    } else {
      this.id = site.id
      this.siteName = site.siteName
      this.siteDescription = undefined
      this.sortNum = site.sortNum
    }
  }
}
