import BaseQueryDTO from './BaseQueryDTO.js'
import { notNullish } from '../../util/CommonUtil.js'

/**
 * 站点域名-queryDTO
 */
export default class SiteDomainQueryDTO extends BaseQueryDTO {
  /**
   * 站点id
   */
  siteId?: number | string | undefined | null

  /**
   * 域名
   */
  domain?: string | undefined | null

  /**
   * 主页
   */
  homepage?: string | undefined | null

  constructor(siteDomainQueryDTO?: SiteDomainQueryDTO) {
    super(siteDomainQueryDTO)
    if (notNullish(siteDomainQueryDTO)) {
      this.siteId = siteDomainQueryDTO.siteId
      this.domain = siteDomainQueryDTO.domain
      this.homepage = siteDomainQueryDTO.homepage
    }
  }
}
