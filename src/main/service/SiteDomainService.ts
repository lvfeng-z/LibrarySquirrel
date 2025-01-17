import BaseService from './BaseService.js'
import SiteDomainQueryDTO from '../model/queryDTO/SiteDomainQueryDTO.js'
import SiteDomain from '../model/entity/SiteDomain.js'
import SiteDomainDao from '../dao/SiteDomainDao.js'
import DB from '../database/DB.js'
import { Operator } from '../constant/CrudConstant.js'

export default class SiteDomainService extends BaseService<SiteDomainQueryDTO, SiteDomain, SiteDomainDao> {
  constructor(db?: DB) {
    super('', new SiteDomainDao(db), db)
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
}
