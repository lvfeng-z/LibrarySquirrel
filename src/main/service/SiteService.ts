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
        LogUtil.warn('SiteAuthorService', `域名：${domain}在数据库中存在多个作者`)
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
