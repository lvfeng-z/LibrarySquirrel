import BaseDao from './BaseDao.ts'
import SiteTag from '../model/entity/SiteTag.ts'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO.ts'
import SelectItem from '../model/util/SelectItem.ts'
import StringUtil from '../util/StringUtil.ts'
import SiteTagDTO from '../model/dto/SiteTagDTO.ts'
import Page from '../model/util/Page.ts'
import { Operator } from '../constant/CrudConstant.ts'
import DB from '../database/DB.ts'
import { isNullish, notNullish } from '../util/CommonUtil.js'

export default class SiteTagDao extends BaseDao<SiteTagQueryDTO, SiteTag> {
  tableName: string = 'site_tag'

  constructor(db?: DB) {
    super('site_tag', 'SiteTagDao', db)
  }

  /**
   * 站点标签绑定在本地标签上
   * @param localTagId 本地标签id
   * @param siteTagIds 站点标签id列表
   */
  public async updateBindLocalTag(localTagId: string | null, siteTagIds: string[]): Promise<number> {
    if (siteTagIds.length > 0) {
      const setClause: string[] = []
      siteTagIds.forEach((siteTagId) => {
        setClause.push(`WHEN ${siteTagId} THEN ${localTagId} `)
      })
      const statement = `UPDATE ${this.tableName} SET local_tag_id = (CASE ${setClause.join('')} END) WHERE id IN (${siteTagIds.join()})`

      const db = super.acquire()
      return db
        .run(statement)
        .then((runResult) => runResult.changes)
        .finally(() => {
          if (!this.injectedDB) {
            db.release()
          }
        })
    } else {
      return 0
    }
  }

  /**
   * 查询站点标签（附带绑定的本地标签）
   * @param page
   */
  public async queryBoundOrUnboundToLocalTagPage(page: Page<SiteTagQueryDTO, SiteTag>): Promise<SiteTagDTO[]> {
    // 没有查询参数，构建一个空的
    if (page.query === undefined) {
      page.query = new SiteTagQueryDTO()
    }

    // 如果是bound是false，则查询local_tag_id不等于给定localTagId的
    if (page.query.bound) {
      page.query.operators = {
        ...page.query.operators,
        ...{ localTagId: Operator.EQUAL }
      }
    } else {
      page.query.operators = {
        ...page.query.operators,
        ...{ localTagId: Operator.NOT_EQUAL }
      }
    }

    const selectClause = `SELECT t1.id, t1.site_id AS siteId, t1.site_tag_id AS siteTagId, t1.site_tag_name AS siteTagName, t1.base_site_tag_id AS baseSiteTagId, t1.description, t1.local_tag_id AS localTagId,
                json_object('id', t2.id, 'localTagName', t2.local_tag_name, 'baseLocalTagId', t2.base_local_tag_id) AS localTag,
                json_object('id', t3.id, 'siteName', t3.site_name, 'siteDomain', t3.site_domain, 'siteHomepage', t3.site_domain) AS site`
    const fromClause = `FROM site_tag t1
          LEFT JOIN local_tag t2 ON t1.local_tag_id = t2.id
          LEFT JOIN site t3 ON t1.site_id = t3.id`
    const whereClausesAndQuery = this.getWhereClauses(page.query, 't1')

    const whereClauses = whereClausesAndQuery.whereClauses
    const modifiedQuery = whereClausesAndQuery.query

    // 删除用于标识localTagId运算符的属性生成的子句
    delete whereClauses.bound

    // 处理keyword
    if (Object.prototype.hasOwnProperty.call(page.query, 'keyword') && StringUtil.isNotBlank(page.query.keyword)) {
      whereClauses.keyword = 't1.site_tag_name LIKE @keyword'
      modifiedQuery.keyword = page.query.keywordForFullMatch()
    }

    const whereClauseArray = Object.entries(whereClauses).map((whereClause) => whereClause[1])

    // 拼接sql语句
    let statement = selectClause + ' ' + fromClause
    const whereClause = super.splicingWhereClauses(whereClauseArray)
    if (StringUtil.isNotBlank(whereClause)) {
      statement += ' ' + whereClause
    }
    const sort = isNullish(page.query?.sort) ? {} : page.query.sort
    statement = await super.sortAndPage(statement, whereClause, page, sort, fromClause)

    // 查询
    const db = super.acquire()
    return db
      .all<unknown[], SiteTagDTO>(statement, modifiedQuery.toPlainParams())
      .then((results) => {
        // 利用构造方法反序列化本地标签和站点的json
        return results.map((result) => new SiteTagDTO(result))
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 查询SelectItem列表
   * @param queryDTO
   */
  public async listSelectItems(queryDTO: SiteTagQueryDTO): Promise<SelectItem[]> {
    const selectFrom = 'SELECT id AS value, site_tag_name AS label FROM site_tag'
    let where = ''
    const columns: string[] = []
    const values: string[] = []

    if (queryDTO.keyword != undefined && StringUtil.isNotBlank(queryDTO.keyword)) {
      columns.push('site_tag_name LIKE ?')
      values.push('%' + queryDTO.keyword + '%')
    }
    if (queryDTO.sites != undefined && queryDTO.sites.length > 0) {
      columns.push('site_id in (?)') // todo 只用逗号隔开不行
      values.push(queryDTO.sites.toString())
    }
    if (queryDTO.localTagId != undefined) {
      columns.push('local_tag_id = ?')
      values.push(String(queryDTO.localTagId))
    }

    if (columns.length == 1) {
      where = ' WHERE ' + columns.toString()
    } else if (columns.length > 1) {
      where = ' WHERE ' + columns.join(' AND ')
    }

    const sql: string = selectFrom + where

    const db = super.acquire()
    return db.all<unknown[], SelectItem>(sql, values).finally(() => {
      if (!this.injectedDB) {
        db.release()
      }
    })
  }

  /**
   * 分页查询SelectItem
   * @param page 分页查询参数
   */
  public async querySelectItemPage(page: Page<SiteTagQueryDTO, SiteTag>): Promise<Page<SiteTagQueryDTO, SelectItem>> {
    // 以json字符串的形式返回本地标签和站点信息
    const selectClause = `SELECT t1.id, t1.site_id AS siteId, t1.site_tag_id AS siteTagId, t1.site_tag_name AS siteTagName, t1.base_site_tag_id AS baseSiteTagId, t1.description, t1.local_tag_id AS localTagId,
                JSON_OBJECT('id', t2.id, 'localTagName', t2.local_tag_name, 'baseLocalTagId', t2.base_local_tag_id) AS localTag,
                JSON_OBJECT('id', t3.id, 'siteName', t3.site_name, 'siteDomain', t3.site_domain, 'siteHomepage', t3.site_domain) AS site`
    const fromClause = `FROM site_tag t1
          LEFT JOIN local_tag t2 ON t1.local_tag_id = t2.id
          LEFT JOIN site t3 ON t1.site_id = t3.id`
    let whereClause: string = ''
    let query: SiteTagQueryDTO | undefined
    if (notNullish(page.query)) {
      const whereClausesAndQuery = this.getWhereClause(page.query, 't1')
      if (notNullish(whereClausesAndQuery.whereClause)) {
        whereClause += whereClausesAndQuery.whereClause
      }
      query = whereClausesAndQuery.query
    }

    let statement = selectClause + ' ' + fromClause + ' ' + whereClause
    const sort = isNullish(page.query?.sort) ? {} : page.query.sort
    statement = await this.sortAndPage(statement, whereClause, page, sort, fromClause)

    const db = this.acquire()
    return db
      .all<unknown[], SiteTagDTO>(statement, query)
      .then((rows) => {
        const selectItems = rows.map((row) => {
          const siteTagDTO = new SiteTagDTO(row)
          const selectItem = new SelectItem()
          selectItem.value = siteTagDTO.id
          selectItem.label = siteTagDTO.siteTagName
          // 站点名称列入副标题中
          if (notNullish(siteTagDTO.site?.siteName)) {
            selectItem.subLabels = [siteTagDTO.site?.siteName]
          }
          // 本地标签和站点信息保存在额外数据中
          selectItem.extraData = { ...siteTagDTO }
          return selectItem
        })
        const result = page.transform<SelectItem>()
        result.data = selectItems
        return result
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
