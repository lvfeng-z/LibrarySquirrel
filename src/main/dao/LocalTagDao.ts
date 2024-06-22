import LocalTag from '../model/LocalTag.ts'
import SelectItem from '../model/utilModels/SelectItem.ts'
import StringUtil from '../util/StringUtil.ts'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO.ts'
import BaseDao from './BaseDao.ts'
import PageModel from '../model/utilModels/PageModel.ts'

export default class LocalTagDao extends BaseDao<LocalTagQueryDTO, LocalTag> {
  constructor() {
    super('local_tag', 'LocalTagDao')
  }
  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }

  public async selectPage(
    page: PageModel<LocalTagQueryDTO, LocalTag>
  ): Promise<PageModel<LocalTagQueryDTO, LocalTag>> {
    const db = this.acquire()
    try {
      const selectClause = 'select * from local_tag'
      let whereClause: string | undefined
      const modifiedPage = new PageModel(page)

      if (page.query !== undefined) {
        const whereClausesAndQuery = this.getWhereClauses(page.query)

        modifiedPage.query = whereClausesAndQuery.query

        const whereClauses = Object.entries(whereClausesAndQuery.whereClauses).map(
          (whereClause) => whereClause[1]
        )

        // 处理keyword
        if (StringUtil.isNotBlank(modifiedPage.query.keyword)) {
          whereClauses.push('local_tag_name like @keyword')
          modifiedPage.query = new LocalTagQueryDTO(page.query)
          whereClausesAndQuery.query.keyword = modifiedPage.query.getKeywordLikeString()
        }
        whereClause = this.splicingWhereClauses(whereClauses)
      }

      // 拼接查询语句
      let statement = selectClause
      if (whereClause !== undefined) {
        statement = statement.concat(' ', whereClause)
      }
      // 拼接排序和分页字句
      statement = await this.sorterAndPager(statement, whereClause, modifiedPage)

      modifiedPage.data = this.getResultTypeDataList<LocalTag>(
        (await db.prepare(statement)).all(modifiedPage.query) as []
      )
      return modifiedPage
    } finally {
      db.release()
    }
  }

  public async getSelectList(queryDTO: LocalTagQueryDTO): Promise<SelectItem[]> {
    const db = this.acquire()
    try {
      const selectFrom = `select id as value, local_tag_name as label, '本地' as secondaryLabel from local_tag`
      let where = ''
      const columns: string[] = []
      const values: string[] = []

      if (queryDTO.keyword != undefined && StringUtil.isNotBlank(queryDTO.keyword)) {
        columns.push('local_tag_name like ?')
        values.push('%' + queryDTO.keyword + '%')
      }

      if (columns.length == 1) {
        where = ' where ' + columns.toString()
      } else if (columns.length > 1) {
        where = ' where ' + columns.join(' and ')
      }

      const sql: string = selectFrom + where

      return (await db.prepare(sql)).all(values) as SelectItem[]
    } finally {
      db.release()
    }
  }

  /**
   * 递归查询某个标签的子标签，默认查询深度为10
   * @param rootId 根节点id
   * @param depth 查询深度
   */
  async selectTreeNode(rootId: number, depth?: number) {
    const db = this.acquire()
    try {
      if (depth === undefined || depth < 0) {
        depth = 10
      }
      const statement = `WITH RECURSIVE treeNode AS
         (
           SELECT *, 1 AS level
           FROM local_tag
           WHERE base_local_tag_id = @rootId
           UNION ALL
           SELECT local_tag.*, treeNode.level + 1 as level
           FROM local_tag
           JOIN treeNode ON local_tag.base_local_tag_id = treeNode.id
           WHERE treeNode.level < @depth
         )
         SELECT * FROM treeNode`
      const result = (await db.prepare(statement)).all({ rootId: rootId, depth: depth }) as object[]
      return this.getResultTypeDataList<LocalTag>(result)
    } finally {
      db.release()
    }
  }

  /**
   * 递归查询某个标签的上级标签
   * @param nodeId 节点id
   */
  async selectParentNode(nodeId: number) {
    const db = this.acquire()
    try {
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
      const result = (await db.prepare(statement)).all({ nodeId: nodeId }) as object[]
      return this.getResultTypeDataList<LocalTag>(result)
    } finally {
      db.release()
    }
  }
}
