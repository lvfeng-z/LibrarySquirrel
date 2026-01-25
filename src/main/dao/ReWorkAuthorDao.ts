import BaseDao from '../base/BaseDao.ts'
import ReWorkAuthorQueryDTO from '../model/queryDTO/ReWorkAuthorQueryDTO.ts'
import ReWorkAuthor from '../model/entity/ReWorkAuthor.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import { OriginType } from '../constant/OriginType.js'

/**
 * 作品与作者关联Dao
 */
export default class ReWorkAuthorDao extends BaseDao<ReWorkAuthorQueryDTO, ReWorkAuthor> {
  constructor(db: DatabaseClient, injectedDB: boolean) {
    super('re_work_author', ReWorkAuthor, db, injectedDB)
  }

  /**
   * 根据作品id和本地作者id删除
   * @param type
   * @param authorIds
   * @param workId
   */
  public async deleteByWorkIdAndAuthorId(type: OriginType, authorIds: number[], workId: number): Promise<number> {
    const authorIdsStr = authorIds.join(',')
    let statement: string
    if (OriginType.LOCAL === type) {
      statement = `DELETE FROM ${this.tableName} WHERE work_id = ${workId} AND local_author_id IN (${authorIdsStr})`
    } else {
      statement = `DELETE FROM ${this.tableName} WHERE work_id = ${workId} AND site_author_id IN (${authorIdsStr})`
    }
    const db = this.acquire()
    return db.run(statement).then((runResult) => runResult.changes)
  }
}
