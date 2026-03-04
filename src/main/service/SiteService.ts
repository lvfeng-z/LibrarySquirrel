import Site from '@shared/model/entity/Site.ts'
import SiteDao from '../dao/SiteDao.ts'
import SiteQueryDTO from '@shared/model/queryDTO/SiteQueryDTO.ts'
import BaseService from '../base/BaseService.ts'
import Page from '@shared/model/util/Page.ts'
import { Operator } from '../constant/CrudConstant.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish, NotNullish } from '@shared/util/CommonUtil.ts'
import SiteFullDTO from '@shared/model/dto/SiteFullDTO.js'
import SiteDomainService from './SiteDomainService.js'
import SiteDomain from '@shared/model/entity/SiteDomain.js'
import lodash from 'lodash'

/**
 * 站点域名配置
 */
export interface SiteDomainConfig {
  domain: string
  homepage: string
  site?: string
}

export default class SiteService extends BaseService<SiteQueryDTO, Site, SiteDao> {
  constructor(db?: DatabaseClient) {
    super(SiteDao, db)
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
  public async getDTOByDomain(domain: string): Promise<SiteFullDTO | undefined> {
    const site = await this.dao.getByDomain(domain)
    if (IsNullish(site)) {
      return undefined
    }
    const siteFullDTO = new SiteFullDTO(site)
    const siteDomainService = new SiteDomainService(this.db)
    siteFullDTO.domains = await siteDomainService.listBySiteId(siteFullDTO.id as number)
    return siteFullDTO
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
  public async listDTOByDomains(domains: string[]): Promise<SiteFullDTO[] | undefined> {
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
        const tempDTO = new SiteFullDTO(site)
        tempDTO.domains = siteIdDomainMap.get(site.id as number)
        return tempDTO
      })
    } else {
      return sites.map((site) => {
        return new SiteFullDTO(site)
      })
    }
  }

  /**
   * 根据站点名称查询
   * @param siteNames
   */
  async listByNames(siteNames: string[]) {
    return this.dao.listByNames(siteNames)
  }

  /**
   * 保存域名并绑定到站点
   * @param domainConfigs 域名配置列表
   */
  public async saveAndBindDomains(domainConfigs: SiteDomainConfig[]): Promise<void> {
    if (ArrayIsEmpty(domainConfigs)) {
      return
    }

    const siteDomainService = new SiteDomainService(this.db)
    const siteDomains: SiteDomain[] = domainConfigs.map((domainConfig) => {
      const tempSiteDomain = new SiteDomain()
      tempSiteDomain.domain = domainConfig.domain
      tempSiteDomain.homepage = domainConfig.homepage
      return tempSiteDomain
    })
    await siteDomainService.saveBatch(siteDomains, true)

    // 插件的域名关联到站点上
    const bindableConfig = domainConfigs.filter((domainConfig) => NotNullish(domainConfig.site))
    if (ArrayNotEmpty(bindableConfig)) {
      const bindableDomain = bindableConfig.map((domainConfig) => domainConfig.domain)
      const newDomains = await siteDomainService.listByDomains(bindableDomain)
      if (ArrayNotEmpty(newDomains)) {
        const notBindDomains = newDomains.filter((newDomain) => IsNullish(newDomain.siteId))
        if (ArrayNotEmpty(notBindDomains)) {
          const siteNames = bindableConfig.map((domainConfig) => domainConfig.site).filter(NotNullish)
          const siteList = await this.listByNames(siteNames)
          const domainConfigMap = lodash.keyBy(bindableConfig, 'domain')
          const nameSiteMap = lodash.keyBy(siteList, 'siteName')
          notBindDomains.forEach((siteDomain) => {
            if (NotNullish(siteDomain.domain)) {
              const tempConfig = domainConfigMap[siteDomain.domain]
              if (NotNullish(tempConfig.site)) {
                const targetSite = nameSiteMap[tempConfig.site]
                siteDomain.siteId = targetSite?.id
              }
            }
          })
          await siteDomainService.updateBatchById(notBindDomains)
        }
      }
    }
  }
}
