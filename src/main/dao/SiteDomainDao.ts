import BaseDao from './BaseDao.ts'
import DB from '../database/DB.ts'
import SiteDomain from '../model/entity/SiteDomain.js'
import SiteDomainQueryDTO from '../model/queryDTO/SiteDomainQueryDTO.js'
import Page from '../model/util/Page.js'
import { AssertNotNullish } from '../util/AssertUtil.js'
import StringUtil from '../util/StringUtil.js'
import SiteDomainDTO from '../model/dto/SiteDomainDTO.js'

export default class SiteDomainDao extends BaseDao<SiteDomainQueryDTO, SiteDomain> {
  constructor(db?: DB) {
    super('site_domain', SiteDomain, db)
  }

  /**
   * 分页查询DTO
   * @param page
   */
  public async queryDTOPage(page: Page<SiteDomainQueryDTO, SiteDomainDTO>): Promise<Page<SiteDomainQueryDTO, SiteDomainDTO>> {
    const modifiedPage = new Page(page)
    AssertNotNullish(modifiedPage.query, this.constructor.name, '查询站点域名失败，查询参数为空')
    const selectClause = `SELECT t1.*,
          JSON_OBJECT('id', t2.id, 'siteName', t2.site_name, 'siteDescription', site_description, 'sortNum', t2.sort_num) as site
        FROM ${this.tableName} t1
          LEFT JOIN site t2 ON t1.site_id = t2.id`
    const whereClauseAndQuery = super.getWhereClause(modifiedPage.query, 't1', ['boundOnSite'])
    const whereClause = whereClauseAndQuery.whereClause
    const modifiedQuery = whereClauseAndQuery.query
    modifiedPage.query = modifiedQuery
    let statement = selectClause + ' ' + whereClause
    statement = await super.sortAndPage(statement, modifiedPage, modifiedPage.query.sort)
    if (modifiedPage.currentCount < 1) {
      return modifiedPage
    }
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, modifiedQuery)
      .then((rows) => {
        const temp = super.toResultTypeDataList<SiteDomainDTO>(rows)
        modifiedPage.data = temp.map((row) => new SiteDomainDTO(row))
        return modifiedPage
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 分页查询绑定或未绑定到站点的域名
   * @param page
   */
  public async queryPageBySite(page: Page<SiteDomainQueryDTO, SiteDomainDTO>): Promise<Page<SiteDomainQueryDTO, SiteDomainDTO>> {
    const modifiedPage = new Page(page)
    AssertNotNullish(page.query, this.constructor.name, '查询站点域名失败，查询参数为空')
    AssertNotNullish(modifiedPage.query, this.constructor.name, '查询站点域名失败，查询参数为空')
    const selectClause = `SELECT t1.*,
          JSON_OBJECT('id', t2.id, 'siteName', t2.site_name, 'siteDescription', site_description, 'sortNum', t2.sort_num) as site
        FROM ${this.tableName} t1
          LEFT JOIN site t2 ON t1.site_id = t2.id`
    const whereClauseAndQuery = super.getWhereClause(modifiedPage.query, 't1', ['siteId', 'boundOnSite'])
    let whereClause = whereClauseAndQuery.whereClause
    const modifiedQuery = whereClauseAndQuery.query
    modifiedPage.query = modifiedQuery
    modifiedQuery.siteId = page.query.siteId
    if (page.query.boundOnSite) {
      if (StringUtil.isBlank(whereClause)) {
        whereClause = 'WHERE site_id = @siteId'
      } else {
        whereClause = whereClause + ' AND site_id = @siteId'
      }
    } else {
      if (StringUtil.isBlank(whereClause)) {
        whereClause = 'WHERE (site_id != @siteId OR site_id IS NULL)'
      } else {
        whereClause = whereClause + ' AND (site_id != @siteId OR site_id IS NULL)'
      }
    }
    let statement = selectClause + ' ' + whereClause
    statement = await super.sortAndPage(statement, modifiedPage, modifiedPage.query.sort)
    if (modifiedPage.currentCount < 1) {
      return modifiedPage
    }
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, modifiedQuery)
      .then((rows) => {
        const temp = super.toResultTypeDataList<SiteDomainDTO>(rows)
        modifiedPage.data = temp.map((row) => new SiteDomainDTO(row))
        return modifiedPage
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
