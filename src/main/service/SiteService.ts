import Site from '../model/entity/Site.ts'
import SiteDao from '../dao/SiteDao.ts'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO.ts'
import BaseService from './BaseService.ts'
import Page from '../model/util/Page.ts'
import { Operator } from '../constant/CrudConstant.ts'
import DB from '../database/DB.ts'
import { arrayIsEmpty, arrayNotEmpty, isNullish, notNullish } from '../util/CommonUtil.ts'
import SiteDTO from '../model/dto/SiteDTO.js'
import SiteDomainService from './SiteDomainService.js'

export default class SiteService extends BaseService<SiteQueryDTO, Site, SiteDao> {
  constructor(db?: DB) {
    super('SiteService', new SiteDao(db), db)
  }

  /**
   * 分页查询SelectItem
   * @param page
   */
  public async querySelectItemPage(page: Page<SiteQueryDTO, Site>) {
    if (isNullish(page)) {
      page = new Page()
    }
    page.query = new SiteQueryDTO(page.query)
    if (isNullish(page.query.operators)) {
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
  public async getByDomain(domain: string): Promise<SiteDTO | undefined> {
    const site = await this.dao.getByDomain(domain)
    if (isNullish(site)) {
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
  public async listByDomains(domains: string[]): Promise<SiteDTO[] | undefined> {
    if (arrayIsEmpty(domains)) {
      return undefined
    }
    const sites = await this.listByDomains(domains)
    if (arrayIsEmpty(sites)) {
      return undefined
    }
    const siteIds = sites.map((site) => site.id).filter(notNullish)
    const siteDomainService = new SiteDomainService(this.db)
    const siteDomains = await siteDomainService.listBySiteIds(siteIds)
    if (arrayNotEmpty(siteDomains)) {
      // 生成siteId为键，siteDomain列表为值的Map
      const siteIdDomainMap = siteDomains.reduce((acc, item) => {
        // 检查Map中是否已经存在以当前id为键的项
        if (!acc.has(item.id)) {
          acc.set(item.id, [])
        }
        // 将当前项添加到对应id的数组中
        acc.get(item.id).push(item)
        return acc
      }, new Map())
      return sites.map((site) => {
        const tempDTO = new SiteDTO(site)
        tempDTO.domains = siteIdDomainMap.get(site.id)
        return tempDTO
      })
    } else {
      return sites.map((site) => {
        return new SiteDTO(site)
      })
    }
  }
}
