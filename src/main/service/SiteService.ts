import Site from '../model/Site.ts'
import SiteDao from '../dao/SiteDao.ts'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO.ts'
import BaseService from './BaseService.ts'
import BaseDao from '../dao/BaseDao.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import { COMPARATOR } from '../constant/CrudConstant.ts'

export default class SiteService extends BaseService<SiteQueryDTO, Site> {
  constructor() {
    super('SiteService')
  }

  public async getSelectItemPage(page: PageModel<SiteQueryDTO, Site>) {
    const dao = new SiteDao()
    if (page !== undefined && Object.hasOwnProperty.call(page, 'query')) {
      page.query = new SiteQueryDTO(page.query)
      page.query.assignComparator = { siteName: COMPARATOR.LIKE }
    }
    return dao.getSelectItemPage(page, 'id', 'SiteName')
  }

  protected getDao(): BaseDao<SiteQueryDTO, Site> {
    return new SiteDao()
  }
}
