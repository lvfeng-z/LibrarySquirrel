import Site from '@shared/model/entity/Site.ts'
import SiteQueryDTO from '@shared/model/queryDTO/SiteQueryDTO.ts'
import BaseDao from '../base/BaseDao.ts'
import { Database } from '../database/Database.ts'

export default class SiteDao extends BaseDao<SiteQueryDTO, Site> {
  constructor() {
    super('site', Site)
  }

  /**
   * 根据站点名称查询
   * @param siteNames
   */
  async listByNames(siteNames: string[]): Promise<Site[]> {
    const siteNamesStr = siteNames.map((siteName) => `'${siteName}'`).join(',')
    const statement = `SELECT * FROM site WHERE site_name IN (${siteNamesStr})`
    const rows = await Database.all<unknown[], Record<string, string>>(statement)
    return this.toResultTypeDataList<Site>(rows)
  }
}
