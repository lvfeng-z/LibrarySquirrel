import Site from '../model/entity/Site.ts'
import SiteDao from '../dao/SiteDao.ts'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO.ts'
import BaseService from './BaseService.ts'
import PageModel from '../model/util/PageModel.ts'
import { COMPARATOR } from '../constant/CrudConstant.ts'
import StringUtil from '../util/StringUtil.ts'
import LogUtil from '../util/LogUtil.ts'
import DB from '../database/DB.ts'
import { isNullish } from '../util/CommonUtil.ts'

export default class SiteService extends BaseService<SiteQueryDTO, Site, SiteDao> {
  constructor(db?: DB) {
    super('SiteService', new SiteDao(db), db)
  }

  /**
   * 基于域名确认站点是否存在，如果不存在则新增站点
   * @param site
   */
  public async saveOnNotExistByDomain(site: Site) {
    if (StringUtil.isNotBlank(site.siteDomain)) {
      const oldSite = await this.getByDomain(site.siteDomain)
      if (isNullish(oldSite)) {
        await this.save(site)
      }
    } else {
      LogUtil.warn('SiteService', '保存站点时，站点域名意外为空')
    }
  }

  /**
   * 分页查询SelectItem
   * @param page
   */
  public async querySelectItemPage(page: PageModel<SiteQueryDTO, Site>) {
    if (page !== undefined && Object.hasOwnProperty.call(page, 'query')) {
      page.query = new SiteQueryDTO(page.query)
      page.query.assignComparator = { siteName: COMPARATOR.LIKE }
    }
    return this.dao.querySelectItemPage(page, 'id', 'SiteName')
  }

  /**
   * 根据域名查询站点
   * @param domain
   */
  public async getByDomain(domain: string): Promise<Site | undefined> {
    if (StringUtil.isNotBlank(domain)) {
      const query = new SiteQueryDTO()
      query.siteDomain = domain
      const sites = await this.dao.list(query)
      if (sites.length === 1) {
        return sites[0]
      }
      if (sites.length > 1) {
        LogUtil.warn('SiteAuthorService', `域名：${domain}在数据库中存在多个站点`)
        return sites[0]
      }
      return undefined
    } else {
      throw new Error('')
    }
  }

  /**
   * 获取域名为键，站点id为值的Record对象
   * @param domains
   */
  public async getIdDomainRecord(domains: string[]): Promise<Record<string, number>> {
    return this.dao.getIdDomainRecord(domains)
  }
}
