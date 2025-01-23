import BaseQueryDTO from './BaseQueryDTO.js'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

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

  /**
   * 查询绑定在siteId指定站点的还是未绑定的
   */
  boundOnSite?: boolean | undefined | null

  constructor(siteDomainQueryDTO?: SiteDomainQueryDTO) {
    super(siteDomainQueryDTO)
    if (NotNullish(siteDomainQueryDTO)) {
      this.siteId = siteDomainQueryDTO.siteId
      this.domain = siteDomainQueryDTO.domain
      this.homepage = siteDomainQueryDTO.homepage
      this.boundOnSite = siteDomainQueryDTO.boundOnSite
    }
  }
}
