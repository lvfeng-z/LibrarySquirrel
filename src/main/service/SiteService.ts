import Site from '../model/entity/Site.ts'
import SiteDao from '../dao/SiteDao.ts'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO.ts'
import BaseService from './BaseService.ts'
import Page from '../model/util/Page.ts'
import { Operator } from '../constant/CrudConstant.ts'
import DB from '../database/DB.ts'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish, NotNullish } from '../util/CommonUtil.ts'
import SiteDTO from '../model/dto/SiteDTO.js'
import SiteDomainService from './SiteDomainService.js'
import SiteDomain from '../model/entity/SiteDomain.js'

export default class SiteService extends BaseService<SiteQueryDTO, Site, SiteDao> {
  constructor(db?: DB) {
    super('SiteService', new SiteDao(db), db)
  }

  /**
   * 分页查询SelectItem
   * @param page
   */
  public async queryPage(page: Page<SiteQueryDTO, Site>): Promise<Page<SiteQueryDTO, Site>> {
    if (IsNullish(page)) {
      page = new Page()
    }
    page.query = new SiteQueryDTO(page.query)
    if (IsNullish(page.query.operators)) {
      page.query.operators = { siteName: Operator.LIKE }
    }
    if (!Object.hasOwn(page.query.operators, 'siteName')) {
      page.query.operators['siteName'] = Operator.LIKE
    }
    return this.dao.queryPage(page)
  }

  /**
   * 分页查询SelectItem
   * @param page
   */
  public async querySelectItemPage(page: Page<SiteQueryDTO, Site>) {
    if (IsNullish(page)) {
      page = new Page()
    }
    page.query = new SiteQueryDTO(page.query)
    if (IsNullish(page.query.operators)) {
      page.query.operators = { siteName: Operator.LIKE }
    }
    if (!Object.hasOwn(page.query.operators, 'siteName')) {
      page.query.operators['siteName'] = Operator.LIKE
    }
    return this.dao.querySelectItemPage(page, 'id', 'SiteName')
  }

  /**
   * 根据域名查询站点
   * @param domain
   */
  public async getByDomain(domain: string): Promise<Site | undefined> {
    return this.dao.getByDomain(domain)
  }

  /**
   * 根据域名查询站点DTO
   * @param domain
   */
  public async getDTOByDomain(domain: string): Promise<SiteDTO | undefined> {
    const site = await this.dao.getByDomain(domain)
    if (IsNullish(site)) {
      return undefined
    }
    const siteDTO = new SiteDTO(site)
    const siteDomainService = new SiteDomainService(this.db)
    siteDTO.domains = await siteDomainService.listBySiteId(siteDTO.id as number)
    return siteDTO
  }

  /**
   * 根据域名列表查询站点列表
   * @param domains 域名列表
   */
  public async listByDomains(domains: string[]): Promise<Site[] | undefined> {
    if (ArrayIsEmpty(domains)) {
      return undefined
    }
    return this.dao.listByDomains(domains)
  }

  /**
   * 根据域名列表查询站点DTO列表
   * @param domains 域名列表
   */
  public async listDTOByDomains(domains: string[]): Promise<SiteDTO[] | undefined> {
    if (ArrayIsEmpty(domains)) {
      return undefined
    }
    const sites = await this.dao.listByDomains(domains)
    if (ArrayIsEmpty(sites)) {
      return undefined
    }
    const siteIds = sites.map((site) => site.id).filter(NotNullish)
    const siteDomainService = new SiteDomainService(this.db)
    const siteDomains = await siteDomainService.listBySiteIds(siteIds)
    if (ArrayNotEmpty(siteDomains)) {
      // 生成siteId为键，siteDomain列表为值的Map
      const siteIdDomainMap = Map.groupBy<number, SiteDomain>(siteDomains, (siteDomain) => siteDomain.siteId as number)
      return sites.map((site) => {
        const tempDTO = new SiteDTO(site)
        tempDTO.domains = siteIdDomainMap.get(site.id as number)
        return tempDTO
      })
    } else {
      return sites.map((site) => {
        return new SiteDTO(site)
      })
    }
  }
}
