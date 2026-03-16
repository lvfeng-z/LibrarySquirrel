import BaseDao from '../base/BaseDao.ts'
import SiteAuthorQueryDTO from '@shared/model/queryDTO/SiteAuthorQueryDTO.ts'
import SiteAuthor from '@shared/model/entity/SiteAuthor.ts'
import { Database } from '../database/Database.ts'
import Page from '@shared/model/util/Page.ts'
import { Operator } from '../constant/CrudConstant.ts'
import RankedSiteAuthor from '@shared/model/domain/RankedSiteAuthor.ts'
import { isNullish, notNullish } from '@shared/util/CommonUtil.ts'
import SelectItem from '@shared/model/util/SelectItem.js'
import { toPlainParams } from '../util/DatabaseUtil.ts'
import { assertArrayNotEmpty } from '@shared/util/AssertUtil.ts'
import SiteAuthorFullDTO from '@shared/model/dto/SiteAuthorFullDTO.js'
import lodash from 'lodash'
import SiteAuthorLocalRelateDTO from '@shared/model/dto/SiteAuthorLocalRelateDTO.js'
import RankedSiteAuthorWithWorkId from '@shared/model/domain/RankedSiteAuthorWithWorkId.ts'
import { isBlank, isNotBlank } from '@shared/util/StringUtil.ts'

/**
 * 站点作者Dao
 */
export default class SiteAuthorDao extends BaseDao<SiteAuthorQueryDTO, SiteAuthor> {
  constructor() {
    super('site_author', SiteAuthor)
  }

  /**
   * 根据站点作者Id列表查询
   * @param siteAuthorIs
   */
  async listBySiteAuthorIds(siteAuthorIs: string[]) {
    const statement = `SELECT * FROM "${this.tableName}" WHERE site_author_id IN (${siteAuthorIs.join(',')})`
    const rows = await Database.all<unknown[], Record<string, unknown>>(statement)
    return this.toResultTypeDataList<SiteAuthor>(rows)
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
      const runResult = await Database.run(statement)
      return runResult.changes
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
    if (isNotBlank(whereClause)) {
      statement = statement.concat(' ', whereClause)
    }
    const sort = isNullish(modifiedPage.query?.sort) ? [] : modifiedPage.query.sort
    statement = await super.sortAndPage(statement, modifiedPage, sort)

    const query = toPlainParams(modifiedQuery)
    // 查询
    const rows = await Database.all<unknown[], Record<string, unknown>>(statement, isNullish(query) ? {} : query)
    const rawList = super.toResultTypeDataList<SiteAuthorFullDTO>(rows)
    const resultPage = modifiedPage.transform<SiteAuthorFullDTO>()
    // 利用构造方法反序列化本地作者和站点的json
    resultPage.data = rawList.map((result) => new SiteAuthorFullDTO(result))
    return resultPage
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
    if (notNullish(page.query)) {
      const whereClausesAndQuery = this.getWhereClause(page.query, 't1')
      if (notNullish(whereClausesAndQuery.whereClause)) {
        whereClause += whereClausesAndQuery.whereClause
      }
      query = whereClausesAndQuery.query
    }

    let statement = selectClause + ' ' + fromClause + ' ' + whereClause
    const sort = isNullish(page.query?.sort) ? [] : page.query.sort
    statement = await this.sortAndPage(statement, page, sort, 't1')

    const rows = await Database.all<unknown[], RankedSiteAuthor>(statement, query)
    const selectItems = rows.map((row) => {
      const siteAuthorDTO = new SiteAuthorFullDTO(row)
      const selectItem = new SelectItem()
      selectItem.value = siteAuthorDTO.id
      selectItem.label = siteAuthorDTO.authorName
      // 站点名称列入副标题中
      if (notNullish(siteAuthorDTO.site?.siteName)) {
        selectItem.subLabels = [siteAuthorDTO.site?.siteName]
      }
      // 本地作者和站点信息保存在额外数据中
      selectItem.extraData = { ...siteAuthorDTO }
      return selectItem
    })
    const result = page.transform<SelectItem>()
    result.data = selectItems
    return result
  }

  /**
   * 根据作者在站点的id及站点id查询
   * @param siteAuthors 站点作者
   */
  public async listBySiteAuthor(siteAuthors: { siteAuthorId: string; siteId: number }[]): Promise<SiteAuthor[]> {
    assertArrayNotEmpty(siteAuthors, '根据站点作者查询失败，参数不能为空')
    const whereClause = siteAuthors
      .map((siteAuthor) => `(site_author_id = ${siteAuthor.siteAuthorId} AND site_id = ${siteAuthor.siteId})`)
      .join(' OR ')
    const statement = `SELECT * FROM site_author WHERE ${whereClause}`
    const rows = await Database.all<unknown[], Record<string, unknown>>(statement)
    return this.toResultTypeDataList<SiteAuthor>(rows)
  }

  /**
   * 查询作品的站点作者
   * @param workId 作品id
   */
  async listByWorkId(workId: number): Promise<RankedSiteAuthor[]> {
    const statement = `SELECT t1.*, t2.author_rank
                       FROM site_author t1
                              INNER JOIN re_work_author t2 ON t1.id = t2.site_author_id
                       WHERE t2.work_id = ${workId}`
    const runResult = await Database.all<unknown[], Record<string, unknown>>(statement)
    return super.toResultTypeDataList<RankedSiteAuthor>(runResult)
  }

  /**
   * 查询作品的站点作者列表
   * @param workIds 作品id列表
   */
  async listRankedSiteAuthorWithWorkIdByWorkIds(workIds: number[]): Promise<RankedSiteAuthorWithWorkId[]> {
    const statement = `SELECT t1.*, t2.author_rank, t2.work_id
                       FROM site_author t1
                              INNER JOIN re_work_author t2 ON t1.id = t2.site_author_id
                       WHERE t2.work_id IN (${workIds.join(',')})`
    const runResult = await Database.all<unknown[], Record<string, unknown>>(statement)
    return super.toResultTypeDataList<RankedSiteAuthorWithWorkId>(runResult)
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
    if (isNullish(modifiedPage.query)) {
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
    modifiedPage.query.workId = query.workId
    modifiedPage.query.boundOnWorkId = query.boundOnWorkId

    const whereClause = super.splicingWhereClauses(whereClauses.values().toArray())

    let statement = selectClause + ' ' + fromClause + (isBlank(whereClause) ? '' : ' ' + whereClause) + ' GROUP BY t1.id'
    const sort = isNullish(modifiedPage.query?.sort) ? [] : modifiedPage.query.sort
    statement = await super.sortAndPage(statement, modifiedPage, sort)
    const rows = await Database.all<unknown[], Record<string, unknown>>(statement, modifiedQuery)
    const rawList = super.toResultTypeDataList<SiteAuthorLocalRelateDTO>(rows)
    const resultPage = modifiedPage.transform<SiteAuthorLocalRelateDTO>()
    // 利用构造方法反序列化本地标签和站点的json
    resultPage.data = rawList.map((result) => new SiteAuthorLocalRelateDTO(result))
    return resultPage
  }
}
