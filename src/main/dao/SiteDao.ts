import Site from '../model/Site.ts'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO.ts'
import BaseDao from './BaseDao.ts'
import DB from '../database/DB.ts'

export default class SiteDao extends BaseDao<SiteQueryDTO, Site> {
  constructor(db?: DB) {
    super('site', 'SiteDao', db)
  }

  /**
   * 获取域名为键，站点id为值的Record对象
   * @param domains
   */
  public async getIdDomainRecord(domains: string[]): Promise<Record<string, number>> {
    const db = this.acquire()
    const statement = `SELECT site_domain as siteDomain, id
         FROM site
         WHERE site_domain in (${domains.join(',')})`
    return db
      .all<unknown[], Record<string, string | number>>(statement)
      .then((rows) => {
        const result: Record<string, number> = {}
        rows.forEach((row) => (result[row['siteDomain']] = <number>row['id']))
        return result
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
