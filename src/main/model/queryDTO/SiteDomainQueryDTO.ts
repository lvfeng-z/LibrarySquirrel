import { BaseQueryDTO } from '../../base/BaseQueryDTO.js'
import { NotNullish } from '../../util/CommonUtil.js'

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
  domain?: string | string[] | undefined | null

  /**
   * 主页
   */
  homepage?: string | undefined | null

  /**
   * 查询绑定在siteId指定站点的还是未绑定的
   */
  boundOnSite?: boolean | undefined | null

  /**
   * 域名列表
   */
  domains?: string[] | string

  constructor(siteDomainQueryDTO?: SiteDomainQueryDTO) {
    super(siteDomainQueryDTO)
    if (NotNullish(siteDomainQueryDTO)) {
      this.siteId = siteDomainQueryDTO.siteId
      this.domain = siteDomainQueryDTO.domain
      this.homepage = siteDomainQueryDTO.homepage
      this.boundOnSite = siteDomainQueryDTO.boundOnSite
      this.domains = siteDomainQueryDTO.domains
    }
  }
}
