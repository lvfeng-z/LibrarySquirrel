import BaseDao from './BaseDao.ts'
import SiteAuthorQueryDTO from '../model/queryDTO/SiteAuthorQueryDTO.ts'
import SiteAuthor from '../model/SiteAuthor.ts'
import DB from '../database/DB.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import { COMPARATOR } from '../constant/CrudConstant.ts'
import StringUtil from '../util/StringUtil.ts'
import SiteAuthorDTO from '../model/dto/SiteAuthorDTO.ts'
import { isNullish } from '../util/CommonUtil.ts'

/**
 * 站点作者Dao
 */
export default class SiteAuthorDao extends BaseDao<SiteAuthorQueryDTO, SiteAuthor> {
  constructor(db?: DB) {
    super('site_author', 'SiteAuthorDao', db)
  }

  /**
   * 根据站点作者Id列表查询
   * @param siteAuthorIs
   */
  async listBySiteAuthorIds(siteAuthorIs: string[]) {
    const db = this.acquire()
    const statement = `SELECT * FROM "${this.tableName}" WHERE site_author_id in ${siteAuthorIs.join(',')}`
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((rows) => this.getResultTypeDataList<SiteAuthor>(rows))
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
  public async updateBindLocalAuthor(
    localAuthorId: string | null,
    siteAuthorIds: string[]
  ): Promise<number> {
    if (siteAuthorIds.length > 0) {
      const setClause: string[] = []
      siteAuthorIds.forEach((siteAuthorId) => {
        setClause.push(`when ${siteAuthorId} then ${localAuthorId} `)
      })
      const statement = `update ${this.tableName} set local_author_id = (case ${setClause.join('')} end) where id in (${siteAuthorIds.join()})`
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
  public async listSiteAuthorWithLocalAuthor(
    page: PageModel<SiteAuthorQueryDTO, SiteAuthor>
  ): Promise<SiteAuthorDTO[]> {
    // 没有查询参数，构建一个空的
    if (page.query === undefined) {
      page.query = new SiteAuthorQueryDTO()
    }

    // 如果是bound是false，则查询local_author_id不等于给定localAuthorId的
    if (page.query.bound) {
      page.query.assignComparator = {
        ...page.query.assignComparator,
        ...{ localAuthorId: COMPARATOR.EQUAL }
      }
    } else {
      page.query.assignComparator = {
        ...page.query.assignComparator,
        ...{ localAuthorId: COMPARATOR.NOT_EQUAL }
      }
    }

    const selectClause = `select t1.id, t1.site_id as siteId, t1.site_author_id as siteAuthorId, t1.site_author_name as siteAuthorName, t1.local_author_id as localAuthorId,
                json_object('id', t2.id, 'localAuthorName', t2.local_author_name) as localAuthor,
                json_object('id', t3.id, 'siteName', t3.site_name, 'siteDomain', t3.site_domain, 'siteHomepage', t3.site_domain) as site`
    const fromClause = `from site_author t1
          left join local_author t2 on t1.local_author_id = t2.id
          left join site t3 on t1.site_id = t3.id`
    const whereClausesAndQuery = this.getWhereClauses(page.query, 't1')

    const whereClauses = whereClausesAndQuery.whereClauses
    const modifiedQuery = whereClausesAndQuery.query

    // 删除用于标识localAuthorId运算符的属性生成的子句
    delete whereClauses.bound

    // 处理keyword
    if (
      Object.prototype.hasOwnProperty.call(page.query, 'keyword') &&
      StringUtil.isNotBlank(page.query.keyword)
    ) {
      whereClauses.keyword = 't1.site_author_name like @keyword'
      modifiedQuery.keyword = page.query.keywordForFullMatch()
    }

    const whereClauseArray = Object.entries(whereClauses).map((whereClause) => whereClause[1])

    // 拼接sql语句
    let statement = selectClause.concat(' ', fromClause)
    const whereClause = super.splicingWhereClauses(whereClauseArray)
    if (StringUtil.isNotBlank(whereClause)) {
      statement = statement.concat(' ', whereClause)
    }
    statement = await super.sorterAndPager(statement, whereClause, page, fromClause)

    const query = modifiedQuery.getQueryObject()
    // 查询
    const db = super.acquire()
    return db
      .all<unknown[], SiteAuthorDTO>(statement, isNullish(query) ? {} : query)
      .then((results) => {
        // 利用构造方法处理localAuthor的JSON字符串
        return results.map((result) => new SiteAuthorDTO(result))
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
