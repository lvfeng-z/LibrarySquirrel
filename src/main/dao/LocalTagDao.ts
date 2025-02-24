import LocalTag from '../model/entity/LocalTag.ts'
import SelectItem from '../model/util/SelectItem.ts'
import StringUtil from '../util/StringUtil.ts'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO.ts'
import BaseDao from '../base/BaseDao.ts'
import DB from '../database/DB.ts'
import Page from '../model/util/Page.js'
import { IsNullish } from '../util/CommonUtil.js'
import lodash from 'lodash'
import LocalTagDTO from '../model/dto/LocalTagDTO.js'

export default class LocalTagDao extends BaseDao<LocalTagQueryDTO, LocalTag> {
  constructor(db?: DB) {
    super('local_tag', LocalTag, db)
  }

  public async listSelectItems(queryDTO: LocalTagQueryDTO): Promise<SelectItem[]> {
    const selectFrom = `SELECT id AS value, local_tag_name AS label, '本地' AS secondaryLabel FROM local_tag`
    let where = ''
    const columns: string[] = []
    const values: string[] = []

    if (queryDTO.keyword != undefined && StringUtil.isNotBlank(queryDTO.keyword)) {
      columns.push('local_tag_name LIKE ?')
      values.push('%' + queryDTO.keyword + '%')
    }

    if (columns.length == 1) {
      where = ' WHERE ' + columns.toString()
    } else if (columns.length > 1) {
      where = ' WHERE ' + columns.join(' AND ')
    }

    const sql: string = selectFrom + where

    const db = this.acquire()
    return db.all<unknown[], SelectItem>(sql, values).finally(() => {
      if (!this.injectedDB) {
        db.release()
      }
    })
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
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, { rootId: rootId, depth: depth })
      .then((result) => this.toResultTypeDataList<LocalTagDTO>(result))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
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
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, { nodeId: nodeId })
      .then((result) => this.toResultTypeDataList<LocalTag>(result))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 查询作品的本地标签
   * @param worksId 作品id
   */
  async listByWorksId(worksId: number): Promise<LocalTag[]> {
    const statement = `SELECT t1.*
                       FROM local_tag t1
                              INNER JOIN re_works_tag t2 ON t1.id = t2.local_tag_id
                              INNER JOIN works t3 ON t2.works_id = t3.id
                       WHERE t3.id = ${worksId}`
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((runResult) => super.toResultTypeDataList<LocalTag>(runResult))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 分页查询作品的本地标签
   * @param page
   */
  async queryPageByWorksId(page: Page<LocalTagQueryDTO, LocalTag>): Promise<Page<LocalTagQueryDTO, LocalTag>> {
    if (IsNullish(page.query)) {
      page.query = new LocalTagQueryDTO()
    }
    const query = lodash.cloneDeep(page.query)

    const selectClause = 'SELECT *'
    const fromClause = 'FROM local_tag t1'
    const whereClauseAndQuery = super.getWhereClauses(query, 't1', ['worksId', 'boundOnWorksId'])
    const whereClauses = whereClauseAndQuery.whereClauses
    const modifiedQuery = whereClauseAndQuery.query
    modifiedQuery.worksId = page.query.worksId
    modifiedQuery.boundOnWorksId = page.query.boundOnWorksId
    page.query = modifiedQuery

    if (
      Object.prototype.hasOwnProperty.call(page.query, 'boundOnWorksId') &&
      Object.prototype.hasOwnProperty.call(page.query, 'worksId')
    ) {
      const existClause = `EXISTS(SELECT 1 FROM re_works_tag WHERE works_id = ${page.query.worksId} AND t1.id = re_works_tag.local_tag_id)`
      if (page.query.boundOnWorksId) {
        whereClauses.set('worksId', existClause)
      } else {
        whereClauses.set('worksId', 'NOT ' + existClause)
      }
    }

    const whereClause = super.splicingWhereClauses(whereClauses.values().toArray())

    let statement = selectClause + ' ' + fromClause + ' ' + whereClause
    const sort = IsNullish(page.query?.sort) ? {} : page.query.sort
    statement = await super.sortAndPage(statement, page, sort)
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, modifiedQuery)
      .then((rows) => {
        page.data = super.toResultTypeDataList<LocalTag>(rows)
        return page
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
