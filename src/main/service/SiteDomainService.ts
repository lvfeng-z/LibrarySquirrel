import BaseService from './BaseService.js'
import SiteDomainQueryDTO from '../model/queryDTO/SiteDomainQueryDTO.js'
import SiteDomain from '../model/entity/SiteDomain.js'
import SiteDomainDao from '../dao/SiteDomainDao.js'
import DB from '../database/DB.js'
import { Operator } from '../constant/CrudConstant.js'
import Page from '../model/util/Page.js'
import { AssertNotNullish } from '../util/AssertUtil.js'
import { IsNullish } from '../util/CommonUtil.js'
import SiteDomainDTO from '../model/dto/SiteDomainDTO.js'

export default class SiteDomainService extends BaseService<SiteDomainQueryDTO, SiteDomain, SiteDomainDao> {
  constructor(db?: DB) {
    super(SiteDomainDao, db)
  }

  /**
   * 根据站点id查询
   * @param siteId 站点id
   */
  public async listBySiteId(siteId: number): Promise<SiteDomain[]> {
    const query = new SiteDomainQueryDTO()
    query.siteId = siteId
    return super.list(query)
  }

  /**
   * 根据站点id列表查询
   * @param siteIds 站点id列表
   */
  public async listBySiteIds(siteIds: number[]): Promise<SiteDomain[]> {
    const query = new SiteDomainQueryDTO()
    query.siteId = siteIds.join(',')
    query.operators = { siteId: Operator.IN }
    return super.list(query)
  }

  /**
   * 根据域名列表查询
   * @param domains 域名列表
   */
  public async listByDomains(domains: string[]): Promise<SiteDomain[]> {
    const query = new SiteDomainQueryDTO()
    query.domain = domains.join(',')
    query.operators = { domain: Operator.IN }
    return super.list(query)
  }

  /**
   * 分页查询绑定或未绑定到站点的域名
   * @param page
   */
  public async queryDTOPageBySite(page: Page<SiteDomainQueryDTO, SiteDomainDTO>): Promise<Page<SiteDomainQueryDTO, SiteDomainDTO>> {
    AssertNotNullish(page.query, this.constructor.name, '查询站点域名失败，查询参数为空')
    if (IsNullish(page.query.sort)) {
      page.query.sort = { updateTime: false, createTime: false }
    }
    return this.dao.queryPageBySite(page)
  }
}
