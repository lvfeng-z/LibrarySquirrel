import BaseEntity from './BaseEntity.ts'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

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

  constructor(site?: Site) {
    super(site)
    if (NotNullish(site)) {
      this.siteName = site.siteName
      this.siteDescription = site.siteDescription
    }
  }
}
