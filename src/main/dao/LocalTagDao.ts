import LocalTag from '../model/LocalTag.ts'
import SelectItem from '../model/utilModels/SelectItem.ts'
import StringUtil from '../util/StringUtil.ts'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO.ts'
import BaseDao from './BaseDao.ts'
import DB from '../database/DB.ts'

export default class LocalTagDao extends BaseDao<LocalTagQueryDTO, LocalTag> {
  constructor(db?: DB) {
    super('local_tag', 'LocalTagDao', db)
  }
  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }

  public async getSelectList(queryDTO: LocalTagQueryDTO): Promise<SelectItem[]> {
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
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, { rootId: rootId, depth: depth })
      .then((result) => this.getResultTypeDataList<LocalTag>(result))
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
      .then((result) => this.getResultTypeDataList<LocalTag>(result))
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
    const statement = `select t1.*
                       from local_tag t1
                              inner join re_works_tag t2 on t1.id = t2.local_tag_id
                              inner join works t3 on t2.works_id = t3.id
                       where t3.id = ${worksId}`
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((runResult) => super.getResultTypeDataList<LocalTag>(runResult))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
