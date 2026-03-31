import LocalTag from '@shared/model/entity/LocalTag.ts'
import SelectItem from '@shared/model/util/SelectItem.ts'
import LocalTagQueryDTO from '@shared/model/queryDTO/LocalTagQueryDTO.ts'
import BaseDao from '../base/BaseDao.ts'
import { Database } from '../database/Database.ts'
import Page from '@shared/model/util/Page.js'
import { isNullish, notNullish } from '@shared/util/CommonUtil.ts'
import lodash from 'lodash'
import LocalTagDTO from '@shared/model/dto/LocalTagDTO.js'
import { toPlainParams } from '../util/DatabaseUtil.ts'
import LocalTagWithWorkId from '@shared/model/domain/LocalTagWithWorkId.ts'
import { isNotBlank } from '@shared/util/StringUtil.ts'

export default class LocalTagDao extends BaseDao<LocalTagQueryDTO, LocalTag> {
  constructor() {
    super('local_tag', LocalTag)
  }

  public async listSelectItems(queryDTO: LocalTagQueryDTO): Promise<SelectItem[]> {
    const selectFrom = `SELECT id AS value, local_tag_name AS label, '本地' AS secondaryLabel FROM local_tag`
    let where = ''
    const columns: string[] = []
    const values: string[] = []

    if (queryDTO.nonFieldKeyword != undefined && isNotBlank(queryDTO.nonFieldKeyword)) {
      columns.push('local_tag_name LIKE ?')
      values.push('%' + queryDTO.nonFieldKeyword + '%')
    }

    if (columns.length == 1) {
      where = ' WHERE ' + columns.toString()
    } else if (columns.length > 1) {
      where = ' WHERE ' + columns.join(' AND ')
    }

    const sql: string = selectFrom + where

    return Database.all<unknown[], SelectItem>(sql, values)
  }

  /**
   * 递归查询某个标签的子标签，默认查询深度为10
   * @param rootId 根节点id
   * @param depth 查询深度
   */
  async selectTreeNode(rootId: number, depth?: number) {
    if (depth === undefined || depth < 0) {
      depth = 10
    }
    const statement = `WITH RECURSIVE treeNode AS
         (
           SELECT *, 1 AS level, NOT EXISTS(SELECT 1 FROM local_tag WHERE base_local_tag_id = t1.id) AS isLeaf
           FROM local_tag t1
           WHERE base_local_tag_id = @rootId
           UNION ALL
           SELECT t1.*, treeNode.level + 1 AS level, NOT EXISTS(SELECT 1 FROM local_tag WHERE base_local_tag_id = t1.id) AS isLeaf
           FROM local_tag t1
           JOIN treeNode ON t1.base_local_tag_id = treeNode.id
           WHERE treeNode.level < @depth
         )
         SELECT * FROM treeNode`
    const result = await Database.all<unknown[], Record<string, unknown>>(statement, { rootId: rootId, depth: depth })
    return this.toResultTypeDataList<LocalTagDTO>(result)
  }

  /**
   * 递归查询某个标签的上级标签
   * @param nodeId 节点id
   */
  async selectParentNode(nodeId: number) {
    const statement = `WITH RECURSIVE parentNode AS
        (
          SELECT *
          FROM local_tag
          WHERE id = @nodeId
          UNION ALL
          SELECT local_tag.*
          FROM local_tag
            JOIN parentNode ON local_tag.id = parentNode.base_local_tag_id
        )
        SELECT * FROM parentNode`
    const result = await Database.all<unknown[], Record<string, unknown>>(statement, { nodeId: nodeId })
    return this.toResultTypeDataList<LocalTag>(result)
  }

  /**
   * 查询作品的本地标签
   * @param workId 作品id
   */
  async listByWorkId(workId: number): Promise<LocalTag[]> {
    const statement = `SELECT t1.*
                       FROM local_tag t1
                              INNER JOIN re_work_tag t2 ON t1.id = t2.local_tag_id
                       WHERE t2.work_id = ${workId}`
    const runResult = await Database.all<unknown[], Record<string, unknown>>(statement)
    return super.toResultTypeDataList<LocalTag>(runResult)
  }

  /**
   * 查询作品的本地标签列表
   * @param workIds 作品id列表
   */
  public async listLocalTagWithWorkIdByWorkIds(workIds: number[]): Promise<LocalTagWithWorkId[]> {
    const statement = `SELECT t1.*, t2.work_id
                       FROM local_tag t1
                              INNER JOIN re_work_tag t2 ON t1.id = t2.local_tag_id
                       WHERE t2.work_id IN (${workIds.join(',')})`
    const runResult = await Database.all<unknown[], Record<string, unknown>>(statement)
    return super.toResultTypeDataList<LocalTagWithWorkId>(runResult)
  }

  /**
   * 分页查询作品的本地标签
   * @param page
   */
  async queryPageByWorkId(page: Page<LocalTagQueryDTO, LocalTag>): Promise<Page<LocalTagQueryDTO, LocalTag>> {
    if (isNullish(page.query)) {
      page.query = new LocalTagQueryDTO()
    }
    const query = lodash.cloneDeep(page.query)

    const selectClause = 'SELECT *'
    const fromClause = 'FROM local_tag t1'
    const whereClauseAndQuery = super.getWhereClauses(query, 't1', LocalTagQueryDTO.nonFieldProperties())
    const whereClauses = whereClauseAndQuery.whereClauses
    const modifiedQuery = whereClauseAndQuery.query
    modifiedQuery.workId = page.query.workId
    modifiedQuery.boundOnWorkId = page.query.boundOnWorkId
    page.query = modifiedQuery

    if (
      Object.prototype.hasOwnProperty.call(page.query, 'boundOnWorkId') &&
      Object.prototype.hasOwnProperty.call(page.query, 'workId')
    ) {
      const existClause = `EXISTS(SELECT 1 FROM re_work_tag WHERE work_id = ${page.query.workId} AND t1.id = re_work_tag.local_tag_id)`
      if (page.query.boundOnWorkId) {
        whereClauses.set('workId', existClause)
      } else {
        whereClauses.set('workId', 'NOT ' + existClause)
      }
    }

    const whereClause = super.splicingWhereClauses(whereClauses.values().toArray())

    let statement = selectClause + ' ' + fromClause + ' ' + whereClause
    const sort = isNullish(page.query?.sort) ? [] : page.query.sort
    statement = await super.sortAndPage(statement, page, sort)
    const rows = await Database.all<unknown[], Record<string, unknown>>(statement, modifiedQuery)
    page.data = super.toResultTypeDataList<LocalTag>(rows)
    return page
  }

  /**
   * 分页查询DTO
   * @param page
   */
  async queryDTOPage(page: Page<LocalTagQueryDTO, LocalTag>): Promise<Page<LocalTagQueryDTO, LocalTagDTO>> {
    const selectClause = `SELECT t1.*,
                                 CASE WHEN t2.id IS NULL THEN NULL ELSE JSON_OBJECT('id', t2.id, 'localTagName', t2.local_tag_name) END AS baseTag
                          FROM local_tag t1
                                 LEFT JOIN local_tag t2 ON t1.base_local_tag_id = t2.id`

    // 生成where字句
    let whereClause: string | undefined
    const modifiedPage = new Page(page)
    if (page.query) {
      const whereClauseAndQuery = this.getWhereClause(page.query, 't1')
      whereClause = whereClauseAndQuery.whereClause

      // 修改过的查询条件
      modifiedPage.query = whereClauseAndQuery.query
    }

    // 拼接查询语句
    let statement = selectClause
    if (whereClause !== undefined) {
      statement = statement.concat(' ', whereClause)
    }
    // 拼接排序和分页字句
    const sort = isNullish(page.query?.sort) ? [] : page.query.sort
    statement = await this.sortAndPage(statement, modifiedPage, sort, 't1')
    if (modifiedPage.currentCount < 1) {
      modifiedPage.data = []
      return modifiedPage.transform<LocalTagDTO>()
    }

    // 查询
    let plainParams: Record<string, unknown> | undefined = undefined
    if (notNullish(modifiedPage.query)) {
      plainParams = toPlainParams(modifiedPage.query)
    }
    const rows = await Database.all<unknown[], Record<string, unknown>>(statement, plainParams)
    const resultList = rows.map((row) => new LocalTagDTO(super.toResultTypeData<LocalTagDTO>(row)))
    const resultPage = modifiedPage.transform<LocalTagDTO>()
    resultPage.data = resultList
    return resultPage
  }
}
