import BaseDao from '../base/BaseDao.ts'
import SiteAuthorQueryDTO from '../model/queryDTO/SiteAuthorQueryDTO.ts'
import SiteAuthor from '../model/entity/SiteAuthor.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import Page from '../model/util/Page.ts'
import { Operator } from '../constant/CrudConstant.ts'
import StringUtil from '../util/StringUtil.ts'
import SiteAuthorRankDTO from '../model/dto/SiteAuthorRankDTO.ts'
import { IsNullish, NotNullish } from '../util/CommonUtil.ts'
import SelectItem from '../model/util/SelectItem.js'
import BaseQueryDTO from '../base/BaseQueryDTO.js'
import { AssertArrayNotEmpty } from '../util/AssertUtil.js'
import SiteAuthorFullDTO from '../model/dto/SiteAuthorFullDTO.js'
import lodash from 'lodash'
import SiteAuthorLocalRelateDTO from '../model/dto/SiteAuthorLocalRelateDTO.js'

/**
 * 站点作者Dao
 */
export default class SiteAuthorDao extends BaseDao<SiteAuthorQueryDTO, SiteAuthor> {
  constructor(db: DatabaseClient, injectedDB: boolean) {
    super('site_author', SiteAuthor, db, injectedDB)
  }

  /**
   * 根据站点作者Id列表查询
   * @param siteAuthorIs
   */
  async listBySiteAuthorIds(siteAuthorIs: string[]) {
    const db = this.acquire()
    const statement = `SELECT * FROM "${this.tableName}" WHERE site_author_id IN (${siteAuthorIs.join(',')})`
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((rows) => this.toResultTypeDataList<SiteAuthor>(rows))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 站点作者绑定在本地作者上
   * @param localAuthorId 本地作者id
   * @param siteAuthorIds 站点作者id列表
   */
  public async updateBindLocalAuthor(localAuthorId: number | null, siteAuthorIds: number[]): Promise<number> {
    if (siteAuthorIds.length > 0) {
      const setClause: string[] = []
      siteAuthorIds.forEach((siteAuthorId) => {
        setClause.push(`WHEN ${siteAuthorId} THEN ${localAuthorId} `)
      })
      const statement = `UPDATE ${this.tableName} SET local_author_id = (CASE ${setClause.join('')} END) WHERE id IN (${siteAuthorIds.join()})`
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
   * 查询站点作者（附带绑定的本地作者）
   * @param page
   */
  public async querySiteAuthorWithLocalAuthorPage(
    page: Page<SiteAuthorQueryDTO, SiteAuthor>
  ): Promise<Page<SiteAuthorQueryDTO, SiteAuthorFullDTO>> {
    // 创建一个新的PageModel实例存储修改过的查询条件
    const modifiedPage = new Page(page)
    // 没有查询参数，构建一个空的
    if (modifiedPage.query === undefined) {
      modifiedPage.query = new SiteAuthorQueryDTO()
    }

    // 如果是bound是false，则查询local_author_id不等于给定localAuthorId的
    if (modifiedPage.query.boundOnLocalAuthorId) {
      modifiedPage.query.operators = {
        ...modifiedPage.query.operators,
        ...{ localAuthorId: Operator.EQUAL, authorName: Operator.LIKE }
      }
    } else {
      modifiedPage.query.operators = {
        ...modifiedPage.query.operators,
        ...{ localAuthorId: Operator.NOT_EQUAL, authorName: Operator.LIKE }
      }
    }

    const selectClause = `SELECT t1.id, t1.site_id AS siteId, t1.site_author_id AS siteAuthorId, t1.author_name AS authorName, t1.fixed_author_name AS fixedAuthorName, t1.local_author_id AS localAuthorId,
             CASE WHEN t2.id IS NULL THEN NULL ELSE JSON_OBJECT('id', t2.id, 'authorName', t2.author_name, 'lastUse', t2.last_use) END AS localAuthor,
             CASE WHEN t3.id IS NULL THEN NULL ELSE JSON_OBJECT('id', t3.id, 'siteName', t3.site_name, 'siteDescription', t3.site_description) END AS site`
    const fromClause = `FROM site_author t1
          LEFT JOIN local_author t2 ON t1.local_author_id = t2.id
          LEFT JOIN site t3 ON t1.site_id = t3.id`
    const whereClausesAndQuery = this.getWhereClauses(modifiedPage.query, 't1', SiteAuthorQueryDTO.nonFieldProperties())

    const whereClauses = whereClausesAndQuery.whereClauses
    const modifiedQuery = whereClausesAndQuery.query
    modifiedPage.query = modifiedQuery

    const whereClauseArray = whereClauses.values().toArray()

    // 拼接sql语句
    let statement = selectClause.concat(' ', fromClause)
    const whereClause = super.splicingWhereClauses(whereClauseArray)
    if (StringUtil.isNotBlank(whereClause)) {
      statement = statement.concat(' ', whereClause)
    }
    const sort = IsNullish(modifiedPage.query?.sort) ? [] : modifiedPage.query.sort
    statement = await super.sortAndPage(statement, modifiedPage, sort)

    const query = BaseQueryDTO.toPlainParams(modifiedQuery)
    // 查询
    const db = super.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, IsNullish(query) ? {} : query)
      .then((rows) => {
        const rawList = super.toResultTypeDataList<SiteAuthorFullDTO>(rows)
        const resultPage = modifiedPage.transform<SiteAuthorFullDTO>()
        // 利用构造方法反序列化本地作者和站点的json
        resultPage.data = rawList.map((result) => new SiteAuthorFullDTO(result))
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
  public async querySelectItemPage(page: Page<SiteAuthorQueryDTO, SiteAuthor>): Promise<Page<SiteAuthorQueryDTO, SelectItem>> {
    // 以json字符串的形式返回本地作者和站点信息
    const selectClause = `SELECT t1.id, t1.site_id AS siteId, t1.site_author_id AS siteAuthorId, t1.author_name AS authorName, t1.fixed_author_name AS fixedAuthorName, t1.local_author_id AS localAuthorId,
             CASE WHEN t2.id IS NULL THEN NULL ELSE JSON_OBJECT('id', t2.id, 'authorName', t2.author_name, 'lastUse', t2.last_use) END AS localAuthor,
             CASE WHEN t3.id IS NULL THEN NULL ELSE JSON_OBJECT('id', t3.id, 'siteName', t3.site_name, 'siteDescription', t3.site_description) END AS site`
    const fromClause = `FROM site_author t1
          LEFT JOIN local_author t2 ON t1.local_author_id = t2.id
          LEFT JOIN site t3 ON t1.site_id = t3.id`
    let whereClause: string = ''
    let query: SiteAuthorQueryDTO | undefined
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
      .all<unknown[], SiteAuthorRankDTO>(statement, query)
      .then((rows) => {
        const selectItems = rows.map((row) => {
          const siteAuthorDTO = new SiteAuthorFullDTO(row)
          const selectItem = new SelectItem()
          selectItem.value = siteAuthorDTO.id
          selectItem.label = siteAuthorDTO.authorName
          // 站点名称列入副标题中
          if (NotNullish(siteAuthorDTO.site?.siteName)) {
            selectItem.subLabels = [siteAuthorDTO.site?.siteName]
          }
          // 本地作者和站点信息保存在额外数据中
          selectItem.extraData = { ...siteAuthorDTO }
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
   * 根据作者在站点的id及站点id查询
   * @param siteAuthors 站点作者
   */
  public async listBySiteAuthor(siteAuthors: { siteAuthorId: string; siteId: number }[]): Promise<SiteAuthor[]> {
    AssertArrayNotEmpty(siteAuthors, this.constructor.name, '根据站点作者查询失败，参数不能为空')
    const whereClause = siteAuthors
      .map((siteAuthor) => `(site_author_id = ${siteAuthor.siteAuthorId} AND site_id = ${siteAuthor.siteId})`)
      .join(' OR ')
    const statement = `SELECT * FROM site_author WHERE ${whereClause}`
    const db = this.acquire()
    try {
      const rows = await db.all<unknown[], Record<string, unknown>>(statement)
      return this.toResultTypeDataList<SiteAuthor>(rows)
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  /**
   * 查询作品的站点作者
   * @param worksId 作品id
   */
  async listByWorksId(worksId: number): Promise<SiteAuthorRankDTO[]> {
    const statement = `SELECT t1.*, t2.author_rank
                       FROM site_author t1
                              INNER JOIN re_works_author t2 ON t1.id = t2.site_author_id
                       WHERE t2.works_id = ${worksId}`
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((runResult) => super.toResultTypeDataList<SiteAuthorRankDTO>(runResult))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 分页查询SiteAuthorLocalRelateDTO
   * @param page
   */
  public async queryLocalRelateDTOPage(
    page: Page<SiteAuthorQueryDTO, SiteAuthor>
  ): Promise<Page<SiteAuthorQueryDTO, SiteAuthorLocalRelateDTO>> {
    // 创建一个新的PageModel实例存储修改过的查询条件
    const modifiedPage = new Page(page)
    if (IsNullish(modifiedPage.query)) {
      modifiedPage.query = new SiteAuthorQueryDTO()
    }
    const query = lodash.cloneDeep(modifiedPage.query)

    const selectClause = `
      SELECT t1.id, t1.site_id AS siteId, t1.site_author_id AS siteAuthorId, t1.author_name AS authorName, t1.fixed_author_name AS fixedAuthorName,t1.site_author_name_before AS siteAuthorNameBefore,
             t1.introduce, t1.local_author_id AS localAuthorId, t1.last_use AS lastUse, t1.update_time AS updateTime, t1.create_time AS createTime,
             CASE WHEN t2.id IS NULL THEN NULL ELSE JSON_OBJECT('id', t2.id, 'authorName', t2.author_name, 'lastUse', t2.last_use) END AS localAuthor,
             CASE WHEN t3.id IS NULL THEN NULL ELSE JSON_OBJECT('id', t3.id, 'siteName', t3.site_name, 'siteDescription', t3.site_description) END AS site,
             CASE WHEN t4.id IS NOT NULL THEN TRUE ELSE FALSE END AS hasSameNameLocalAuthor`
    const fromClause = `
      FROM site_author t1
          LEFT JOIN local_author t2 ON t1.local_author_id = t2.id
          LEFT JOIN site t3 ON t1.site_id = t3.id
          LEFT JOIN local_author t4 ON t1.author_name = t4.author_name`
    const whereClauseAndQuery = super.getWhereClauses(query, 't1', SiteAuthorQueryDTO.nonFieldProperties())
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
        const rawList = super.toResultTypeDataList<SiteAuthorLocalRelateDTO>(rows)
        const resultPage = modifiedPage.transform<SiteAuthorLocalRelateDTO>()
        // 利用构造方法反序列化本地标签和站点的json
        resultPage.data = rawList.map((result) => new SiteAuthorLocalRelateDTO(result))
        return resultPage
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
