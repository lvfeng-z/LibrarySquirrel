import Site from '../model/entity/Site.ts'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO.ts'
import BaseDao from '../base/BaseDao.ts'
import DB from '../database/DB.ts'
import SiteFullDTO from '../model/dto/SiteFullDTO.js'
import SiteDomain from '../model/entity/SiteDomain.js'
import { ArrayIsEmpty, ArrayNotEmpty } from '../util/CommonUtil.js'
import LogUtil from '../util/LogUtil.js'

export default class SiteDao extends BaseDao<SiteQueryDTO, Site> {
  constructor(db: DB, injectedDB: boolean) {
    super('site', Site, db, injectedDB)
  }

  /**
   * 主键查询
   * @param id
   */
  public async getById(id: number): Promise<SiteFullDTO> {
    const site = await super.getById(id)
    const siteDTO = new SiteFullDTO(site)
    const statement = `SELECT * FROM site_domain WHERE site_id = ${id}`
    const db = this.acquire()
    return db
      .all<unknown[], SiteDomain>(statement)
      .then((rows) => {
        if (ArrayNotEmpty(rows)) {
          siteDTO.domains = rows.map((row) => new SiteDomain(row))
          return siteDTO
        } else {
          return siteDTO
        }
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 根据域名查询站点
   * @param domain
   */
  public async getByDomain(domain: string): Promise<Site | undefined> {
    const statement = `SELECT t1.* FROM site t1 INNER JOIN site_domain t2 ON t1.id = t2.site_id WHERE t2.domain = @domain`
    const db = this.acquire()
    try {
      const site = await db.all<unknown[], Site>(statement, { domain: domain })
      if (ArrayIsEmpty(site)) {
        return undefined
      } else if (site.length > 1) {
        LogUtil.warn(this.constructor.name, `domain: ${domain}对应了多个站点`)
      }
      return new Site(site[0])
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  /**
   * 根据域名列表查询站点列表
   * @param domains
   */
  public async listByDomains(domains: string[]): Promise<Site[]> {
    const domainsStr = domains.map((domain) => `'${domain}'`).join(',')
    const statement = `SELECT t1.* FROM site t1 INNER JOIN site_domain t2 ON t1.id = t2.site_id WHERE t2.domain IN (${domainsStr})`
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
