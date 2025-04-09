import BaseQueryDTO from './BaseQueryDTO.ts'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

/**
 * QueryDTO
 * 站点标签
 */
export default class SiteQueryDTO extends BaseQueryDTO {
  /**
   * 站点名称
   */
  siteName?: string | undefined | null

  /**
   * 站点描述
   */
  siteDescription?: string | undefined | null

  constructor(siteQueryDTO?: SiteQueryDTO) {
    super(siteQueryDTO)
    if (NotNullish(siteQueryDTO)) {
      this.id = siteQueryDTO.id
      this.siteName = siteQueryDTO.siteName
    }
  }
}
