import BaseEntity from '../../base/BaseEntity.ts'
import { NotNullish } from '../../util/CommonUtil.js'

/**
 * 站点
 */
export default class Site extends BaseEntity {
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
    if (NotNullish(site)) {
      this.siteName = site.siteName
      this.siteDescription = site.siteDescription
      this.sortNum = site.sortNum
    }
  }
}
