import BaseDao from '../base/BaseDao.ts'
import SiteTag from '../model/entity/SiteTag.ts'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO.ts'
import SelectItem from '../model/util/SelectItem.ts'
import StringUtil from '../util/StringUtil.ts'
import SiteTagDTO from '../model/dto/SiteTagDTO.ts'
import Page from '../model/util/Page.ts'
import { Operator } from '../constant/CrudConstant.ts'
import DB from '../database/DB.ts'
import { IsNullish, NotNullish } from '../util/CommonUtil.js'
import lodash from 'lodash'
import { ToPlainParams } from '../base/BaseQueryDTO.js'

export default class SiteTagDao extends BaseDao<SiteTagQueryDTO, SiteTag> {
  tableName: string = 'site_tag'

  constructor(db?: DB) {
    super('site_tag', SiteTag, db)
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
  public async queryBoundOrUnboundToLocalTagPage(page: Page<SiteTagQueryDTO, SiteTag>): Promise<Page<SiteTagQueryDTO, SiteTagDTO>> {
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
                json_object('id', t2.id, 'localTagName', t2.local_tag_name, 'baseLocalTagId', t2.base_local_tag_id) AS localTag,
                json_object('id', t3.id, 'siteName', t3.site_name, 'siteDescription', t3.site_description) AS site`
    const fromClause = `FROM site_tag t1
          LEFT JOIN local_tag t2 ON t1.local_tag_id = t2.id
          LEFT JOIN site t3 ON t1.site_id = t3.id`
    const whereClausesAndQuery = this.getWhereClauses(modifiedPage.query, 't1', ['boundOnLocalTagId'])

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
    const sort = IsNullish(modifiedPage.query?.sort) ? {} : modifiedPage.query.sort
    statement = await super.sortAndPage(statement, modifiedPage, sort, fromClause)

    // 查询
    const db = super.acquire()
    return db
      .all<unknown[], SiteTagDTO>(statement, ToPlainParams(modifiedQuery))
      .then((rows) => {
        const resultPage = modifiedPage.transform<SiteTagDTO>()
        // 利用构造方法反序列化本地标签和站点的json
        resultPage.data = rows.map((result) => new SiteTagDTO(result))
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
    const sort = IsNullish(page.query?.sort) ? {} : page.query.sort
    statement = await this.sortAndPage(statement, page, sort, 't1')

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
  async queryPageByWorksId(page: Page<SiteTagQueryDTO, SiteTag>): Promise<Page<SiteTagQueryDTO, SiteTagDTO>> {
    // 创建一个新的PageModel实例存储修改过的查询条件
    const modifiedPage = new Page(page)
    if (IsNullish(modifiedPage.query)) {
      modifiedPage.query = new SiteTagQueryDTO()
    }
    const query = lodash.cloneDeep(modifiedPage.query)

    const selectClause = `SELECT t1.id, t1.site_id AS siteId, t1.site_tag_id AS siteTagId, t1.site_tag_name AS siteTagName, t1.base_site_tag_id AS baseSiteTagId, t1.description, t1.local_tag_id AS localTagId,
                json_object('id', t2.id, 'localTagName', t2.local_tag_name, 'baseLocalTagId', t2.base_local_tag_id) AS localTag,
                json_object('id', t3.id, 'siteName', t3.site_name, 'siteDescription', t3.site_description) AS site`
    const fromClause = `FROM site_tag t1
          LEFT JOIN local_tag t2 ON t1.local_tag_id = t2.id
          LEFT JOIN site t3 ON t1.site_id = t3.id`
    const whereClauseAndQuery = super.getWhereClauses(query, 't1', ['worksId', 'boundOnWorksId'])
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
    const sort = IsNullish(modifiedPage.query?.sort) ? {} : modifiedPage.query.sort
    statement = await super.sortAndPage(statement, modifiedPage, sort)
    const db = this.acquire()
    return db
      .all<unknown[], SiteTagDTO>(statement, modifiedQuery)
      .then((rows) => {
        const resultPage = modifiedPage.transform<SiteTagDTO>()
        // 利用构造方法反序列化本地标签和站点的json
        resultPage.data = rows.map((result) => new SiteTagDTO(result))
        return resultPage
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 根据标签在站点的id及站点id查询
   * @param siteTagIds 作者在站点的id
   * @param siteId 站点id
   */
  public async listBySiteTag(siteTagIds: string[], siteId: number): Promise<SiteTag[]> {
    const siteTagIdsStr = siteTagIds.join(',')
    const statement = `SELECT * FROM site_tag WHERE site_tag_id IN (@siteTagIds) AND site_id = @siteId`
    const db = this.acquire()
    return db.all<unknown[], SiteTag>(statement, { siteTagIds: siteTagIdsStr, siteId: siteId }).finally(() => {
      if (!this.injectedDB) {
        db.release()
      }
    })
  }
}
