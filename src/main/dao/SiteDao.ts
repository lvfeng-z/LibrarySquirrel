import Site from '@shared/model/entity/Site.ts'
import SiteQueryDTO from '@shared/model/queryDTO/SiteQueryDTO.ts'
import BaseDao from '../base/BaseDao.ts'
import DatabaseClient from '../database/DatabaseClient.ts'

export default class SiteDao extends BaseDao<SiteQueryDTO, Site> {
  constructor(db: DatabaseClient, injectedDB: boolean) {
    super('site', Site, db, injectedDB)
  }

  /**
   * 根据站点名称查询
   * @param siteNames
   */
  async listByNames(siteNames: string[]): Promise<Site[]> {
    const siteNamesStr = siteNames.map((siteName) => `'${siteName}'`).join(',')
    const statement = `SELECT * FROM site WHERE site_name IN (${siteNamesStr})`
    const db = this.acquire()
    try {
      const rows = await db.all<unknown[], Record<string, string>>(statement)
      return this.toResultTypeDataList<Site>(rows)
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }
}
