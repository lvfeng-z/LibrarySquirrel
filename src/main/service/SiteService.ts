import Site from '@shared/model/entity/Site.ts'
import SiteDao from '../dao/SiteDao.ts'
import SiteQueryDTO from '@shared/model/queryDTO/SiteQueryDTO.ts'
import BaseService from '../base/BaseService.ts'
import Page from '@shared/model/util/Page.ts'
import { Operator } from '../constant/CrudConstant.ts'
import { arrayIsEmpty, arrayNotEmpty, isNullish, notNullish } from '@shared/util/CommonUtil.ts'

export default class SiteService extends BaseService<SiteQueryDTO, Site, SiteDao> {
  constructor() {
    super(SiteDao)
  }

  /**
   * 分页查询SelectItem
   * @param page
   */
  public async queryPage(page: Page<SiteQueryDTO, Site>): Promise<Page<SiteQueryDTO, Site>> {
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
    return this.dao.queryPage(page)
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
   * 根据名称查询站点
   * @param siteName 站点名称
   */
  public async getByName(siteName: string) {
    const query = new SiteQueryDTO()
    query.siteName = siteName
    return this.get(query)
  }

  /**
   * 根据站点名称查询
   * @param siteNames
   */
  async listByNames(siteNames: string[]) {
    return this.dao.listByNames(siteNames)
  }

  /**
   * 批量保存站点（如果不存在则创建）
   * @param sites 站点列表
   */
  public async saveBatchIfNotExist(sites: Site[]): Promise<number> {
    if (arrayIsEmpty(sites)) {
      return 0
    }

    const siteNames = sites.map((site) => site.siteName).filter(notNullish)
    const existSites = await this.listByNames(siteNames)
    const existSiteNames = existSites?.map((site) => site.siteName).filter(notNullish) ?? []
    const notExistSiteNames = siteNames.filter((name) => !existSiteNames.includes(name))

    if (arrayNotEmpty(notExistSiteNames)) {
      const newSites = notExistSiteNames.map((siteName) => {
        const site = new Site()
        site.siteName = siteName
        return site
      })
      return super.saveBatch(newSites, true)
    } else {
      return 0
    }
  }
}
