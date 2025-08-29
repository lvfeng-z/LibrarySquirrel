import BaseDao from '../base/BaseDao.ts'
import SiteTag from '../model/entity/SiteTag.ts'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO.ts'
import SelectItem from '../model/util/SelectItem.ts'
import StringUtil from '../util/StringUtil.ts'
import SiteTagFullDTO from '../model/dto/SiteTagFullDTO.ts'
import Page from '../model/util/Page.ts'
import { Operator } from '../constant/CrudConstant.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import { IsNullish, NotNullish } from '../util/CommonUtil.js'
import lodash from 'lodash'
import BaseQueryDTO from '../base/BaseQueryDTO.js'
import { AssertArrayNotEmpty } from '../util/AssertUtil.js'
import SiteTagLocalRelateDTO from '../model/dto/SiteTagLocalRelateDTO.js'

export default class SiteTagDao extends BaseDao<SiteTagQueryDTO, SiteTag> {
  tableName: string = 'site_tag'

  constructor(db: DatabaseClient, injectedDB: boolean) {
    super('site_tag', SiteTag, db, injectedDB)
  }

  /**
   * 站点标签绑定在本地标签上
   * @param localTagId 本地标签id
   * @param siteTagIds 站点标签id列表
   */
  public async updateBindLocalTag(localTagId: number, siteTagIds: number[]): Promise<number> {
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
  public async queryBoundOrUnboundToLocalTagPage(
    page: Page<SiteTagQueryDTO, SiteTag>
  ): Promise<Page<SiteTagQueryDTO, SiteTagFullDTO>> {
    // 创建一个新的PageModel实例存储修改过的查询条件
    const modifiedPage = new Page(page)
    // 没有查询参数，构建一个空的
    if (modifiedPage.query === undefined) {
      modifiedPage.query = new SiteTagQueryDTO()
    }

    // 如果是bound是false，则查询local_tag_id不等于给定localTagId的
    if (modifiedPage.query.boundOnLocalTagId) {
      modifiedPage.query.operators = {
        ...modifiedPage.query.operators,
        ...{ localTagId: Operator.EQUAL, siteTagName: Operator.LIKE }
      }
    } else {
      modifiedPage.query.operators = {
        ...modifiedPage.query.operators,
        ...{ localTagId: Operator.NOT_EQUAL, siteTagName: Operator.LIKE }
      }
    }

    const selectClause = `SELECT t1.id, t1.site_id AS siteId, t1.site_tag_id AS siteTagId, t1.site_tag_name AS siteTagName, t1.base_site_tag_id AS baseSiteTagId, t1.description, t1.local_tag_id AS localTagId,
                JSON_OBJECT('id', t2.id, 'localTagName', t2.local_tag_name, 'baseLocalTagId', t2.base_local_tag_id) AS localTag,
                JSON_OBJECT('id', t3.id, 'siteName', t3.site_name, 'siteDescription', t3.site_description) AS site`
    const fromClause = `FROM site_tag t1
          LEFT JOIN local_tag t2 ON t1.local_tag_id = t2.id
          LEFT JOIN site t3 ON t1.site_id = t3.id`
    const whereClausesAndQuery = this.getWhereClauses(modifiedPage.query, 't1', SiteTagQueryDTO.nonFieldProperties())

    const whereClauses = whereClausesAndQuery.whereClauses
    const modifiedQuery = whereClausesAndQuery.query
    modifiedPage.query = modifiedQuery

    const whereClauseArray = whereClauses.values().toArray()

    // 拼接sql语句
    let statement = selectClause + ' ' + fromClause
    const whereClause = super.splicingWhereClauses(whereClauseArray)
    if (StringUtil.isNotBlank(whereClause)) {
      statement += ' ' + whereClause
    }
    const sort = IsNullish(modifiedPage.query?.sort) ? [] : modifiedPage.query.sort
    statement = await super.sortAndPage(statement, modifiedPage, sort, fromClause)

    // 查询
    const db = super.acquire()
    return db
      .all<unknown[], SiteTagFullDTO>(statement, BaseQueryDTO.toPlainParams(modifiedQuery))
      .then((rows) => {
        const resultPage = modifiedPage.transform<SiteTagFullDTO>()
        // 利用构造方法反序列化本地标签和站点的json
        resultPage.data = rows.map((result) => new SiteTagFullDTO(result))
        return resultPage
      })
      .finally(() => {
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
                JSON_OBJECT('id', t3.id, 'siteName', t3.site_name, 'siteDescription', t3.site_description) AS site`
    const fromClause = `FROM site_tag t1
          LEFT JOIN local_tag t2 ON t1.local_tag_id = t2.id
          LEFT JOIN site t3 ON t1.site_id = t3.id`
    let whereClause: string = ''
    let query: SiteTagQueryDTO | undefined
    if (NotNullish(page.query)) {
      const whereClausesAndQuery = this.getWhereClause(page.query, 't1')
      if (NotNullish(whereClausesAndQuery.whereClause)) {
        whereClause += whereClausesAndQuery.whereClause
      }
      query = whereClausesAndQuery.query
    }

    let statement = selectClause + ' ' + fromClause + ' ' + whereClause
    const sort = IsNullish(page.query?.sort) ? [] : page.query.sort
    statement = await this.sortAndPage(statement, page, sort, 't1')

    const db = this.acquire()
    return db
      .all<unknown[], SiteTagFullDTO>(statement, query)
      .then((rows) => {
        const selectItems = rows.map((row) => {
          const siteTagDTO = new SiteTagFullDTO(row)
          const selectItem = new SelectItem()
          selectItem.value = siteTagDTO.id
          selectItem.label = siteTagDTO.siteTagName
          // 站点名称列入副标题中
          if (NotNullish(siteTagDTO.site?.siteName)) {
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

  /**
   * 分页查询作品的站点标签
   * @param page
   */
  async queryPageByWorksId(page: Page<SiteTagQueryDTO, SiteTag>): Promise<Page<SiteTagQueryDTO, SiteTagFullDTO>> {
    // 创建一个新的PageModel实例存储修改过的查询条件
    const modifiedPage = new Page(page)
    if (IsNullish(modifiedPage.query)) {
      modifiedPage.query = new SiteTagQueryDTO()
    }
    const query = lodash.cloneDeep(modifiedPage.query)

    const selectClause = `SELECT t1.id, t1.site_id AS siteId, t1.site_tag_id AS siteTagId, t1.site_tag_name AS siteTagName, t1.base_site_tag_id AS baseSiteTagId, t1.description, t1.local_tag_id AS localTagId,
                JSON_OBJECT('id', t2.id, 'localTagName', t2.local_tag_name, 'baseLocalTagId', t2.base_local_tag_id) AS localTag,
                JSON_OBJECT('id', t3.id, 'siteName', t3.site_name, 'siteDescription', t3.site_description) AS site`
    const fromClause = `FROM site_tag t1
          LEFT JOIN local_tag t2 ON t1.local_tag_id = t2.id
          LEFT JOIN site t3 ON t1.site_id = t3.id`
    const whereClauseAndQuery = super.getWhereClauses(query, 't1', SiteTagQueryDTO.nonFieldProperties())
    const whereClauses = whereClauseAndQuery.whereClauses
    const modifiedQuery = whereClauseAndQuery.query
    modifiedPage.query = modifiedQuery
    modifiedPage.query.worksId = query.worksId
    modifiedPage.query.boundOnWorksId = query.boundOnWorksId

    if (
      Object.prototype.hasOwnProperty.call(modifiedPage.query, 'boundOnWorksId') &&
      Object.prototype.hasOwnProperty.call(modifiedPage.query, 'worksId')
    ) {
      const existClause = `EXISTS(SELECT 1 FROM re_works_tag WHERE works_id = ${modifiedPage.query.worksId} AND t1.id = re_works_tag.site_tag_id)`
      if (modifiedPage.query.boundOnWorksId) {
        whereClauses.set('worksId', existClause)
      } else {
        whereClauses.set('worksId', 'NOT ' + existClause)
      }
    }

    const whereClause = super.splicingWhereClauses(whereClauses.values().toArray())

    let statement = selectClause + ' ' + fromClause + (StringUtil.isBlank(whereClause) ? '' : ' ' + whereClause)
    const sort = IsNullish(modifiedPage.query?.sort) ? [] : modifiedPage.query.sort
    statement = await super.sortAndPage(statement, modifiedPage, sort)
    const db = this.acquire()
    return db
      .all<unknown[], SiteTagFullDTO>(statement, modifiedQuery)
      .then((rows) => {
        const resultPage = modifiedPage.transform<SiteTagFullDTO>()
        // 利用构造方法反序列化本地标签和站点的json
        resultPage.data = rows.map((result) => new SiteTagFullDTO(result))
        return resultPage
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 分页查询SiteTagLocalRelateDTO
   * @param page
   */
  public async queryLocalRelateDTOPage(page: Page<SiteTagQueryDTO, SiteTag>): Promise<Page<SiteTagQueryDTO, SiteTagLocalRelateDTO>> {
    // 创建一个新的PageModel实例存储修改过的查询条件
    const modifiedPage = new Page(page)
    if (IsNullish(modifiedPage.query)) {
      modifiedPage.query = new SiteTagQueryDTO()
    }
    const query = lodash.cloneDeep(modifiedPage.query)

    const selectClause = `
      SELECT t1.id, t1.site_id AS siteId, t1.site_tag_id AS siteTagId, t1.site_tag_name AS siteTagName, t1.base_site_tag_id AS baseSiteTagId,
             t1.description, t1.local_tag_id AS localTagId, t1.update_time AS updateTime, t1.create_time AS createTime,
             JSON_OBJECT('id', t2.id, 'localTagName', t2.local_tag_name, 'baseLocalTagId', t2.base_local_tag_id) AS localTag,
             JSON_OBJECT('id', t3.id, 'siteName', t3.site_name, 'siteDescription', t3.site_description) AS site,
             CASE WHEN t4.id IS NOT NULL THEN TRUE ELSE FALSE END AS hasSameNameLocalTag`
    const fromClause = `
      FROM site_tag t1
          LEFT JOIN local_tag t2 ON t1.local_tag_id = t2.id
          LEFT JOIN site t3 ON t1.site_id = t3.id
          LEFT JOIN local_tag t4 ON t1.site_tag_name = t4.local_tag_name`
    const whereClauseAndQuery = super.getWhereClauses(query, 't1', SiteTagQueryDTO.nonFieldProperties())
    const whereClauses = whereClauseAndQuery.whereClauses
    const modifiedQuery = whereClauseAndQuery.query
    modifiedPage.query = modifiedQuery
    modifiedPage.query.worksId = query.worksId
    modifiedPage.query.boundOnWorksId = query.boundOnWorksId

    const whereClause = super.splicingWhereClauses(whereClauses.values().toArray())

    let statement = selectClause + ' ' + fromClause + (StringUtil.isBlank(whereClause) ? '' : ' ' + whereClause) + ' GROUP BY t1.id'
    const sort = IsNullish(modifiedPage.query?.sort) ? [] : modifiedPage.query.sort
    statement = await super.sortAndPage(statement, modifiedPage, sort)
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, modifiedQuery)
      .then((rows) => {
        const rawList = super.toResultTypeDataList<SiteTagLocalRelateDTO>(rows)
        const resultPage = modifiedPage.transform<SiteTagLocalRelateDTO>()
        // 利用构造方法反序列化本地标签和站点的json
        resultPage.data = rawList.map((result) => new SiteTagLocalRelateDTO(result))
        return resultPage
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 根据站点标签查询
   * @param siteTags 站点
   */
  public async listBySiteTag(siteTags: { siteTagId: string; siteId: number }[]): Promise<SiteTag[]> {
    AssertArrayNotEmpty(siteTags, this.constructor.name, '根据站点标签查询失败，参数不能为空')
    const whereClause = siteTags
      .map((siteAuthor) => `(site_tag_id = '${siteAuthor.siteTagId}' AND site_id = ${siteAuthor.siteId})`)
      .join(' OR ')
    const statement = `SELECT * FROM ${this.tableName} WHERE ${whereClause}`
    const db = this.acquire()
    try {
      const rows = await db.all<unknown[], Record<string, unknown>>(statement)
      return this.toResultTypeDataList<SiteTag>(rows)
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  /**
   * 查询作品的站点标签
   * @param worksId 作品id
   */
  async listByWorksId(worksId: number): Promise<SiteTag[]> {
    const statement = `SELECT t1.*
                       FROM site_tag t1
                              INNER JOIN re_works_tag t2 ON t1.id = t2.site_tag_id
                       WHERE t2.works_id = ${worksId}`
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((runResult) => super.toResultTypeDataList<SiteTag>(runResult))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 查询作品的站点标签DTO
   * @param worksId
   */
  async listDTOByWorksId(worksId: number): Promise<SiteTagFullDTO[]> {
    const statement = `SELECT t1.*,
                              JSON_OBJECT('id', t3.id, 'localTagName', t3.local_tag_name, 'baseLocalTagId', t3.base_local_tag_id, 'lastUse', t3.last_use) AS localTag,
                              JSON_OBJECT('id', t4.id, 'siteName', t4.site_name, 'siteDescription', t4.site_description) AS site
                       FROM site_tag t1
                              INNER JOIN re_works_tag t2 ON t1.id = t2.site_tag_id
                              LEFT JOIN local_tag t3 ON t1.local_tag_id = t3.id
                              LEFT JOIN site t4 ON t1.site_id = t4.id
                       WHERE t2.works_id = ${worksId}`
    const db = this.acquire()
    try {
      const runResult = await db.all<unknown[], Record<string, unknown>>(statement)
      const originalList = super.toResultTypeDataList<SiteTagFullDTO>(runResult)
      return originalList.map((original) => new SiteTagFullDTO(original))
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }
}
