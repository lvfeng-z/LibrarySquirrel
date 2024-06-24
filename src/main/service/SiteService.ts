import Site from '../model/Site.ts'
import SiteDao from '../dao/SiteDao.ts'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO.ts'
import BaseService from './BaseService.ts'
import BaseDao from '../dao/BaseDao.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import { COMPARATOR } from '../constant/CrudConstant.ts'
import StringUtil from '../util/StringUtil.ts'
import LogUtil from '../util/LogUtil.ts'

export default class SiteService extends BaseService<SiteQueryDTO, Site> {
  constructor() {
    super('SiteService')
  }

  /**
   * 基于域名确认站点是否存在，如果不存在则新增站点
   * @param site
   */
  public async saveOnNotExistByDomain(site: Site) {
    if (StringUtil.isBlank(site.siteDomain)) {
      LogUtil.warn('SiteService', '保存站点时，站点域名意外为空')
    } else {
      const oldSite = await this.getByDomain(site.siteDomain as string)
      if (oldSite === undefined || oldSite === null) {
        await this.save(site)
      }
    }
  }

  /**
   * 分页查询SelectItem
   * @param page
   */
  public async getSelectItemPage(page: PageModel<SiteQueryDTO, Site>) {
    const dao = new SiteDao()
    if (page !== undefined && Object.hasOwnProperty.call(page, 'query')) {
      page.query = new SiteQueryDTO(page.query)
      page.query.assignComparator = { siteName: COMPARATOR.LIKE }
    }
    return dao.getSelectItemPage(page, 'id', 'SiteName')
  }

  /**
   * 根据域名查询站点
   * @param domain
   */
  public async getByDomain(domain: string): Promise<Site | undefined> {
    if (StringUtil.isNotBlank(domain)) {
      const dao = new SiteDao()
      const query = new SiteQueryDTO()
      query.siteDomain = domain
      const sites = await dao.selectList(query)
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

  protected getDao(): BaseDao<SiteQueryDTO, Site> {
    return new SiteDao()
  }
}
