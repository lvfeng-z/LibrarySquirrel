import BaseDao from './BaseDao.ts'
import ReWorksAuthorQueryDTO from '../model/queryDTO/ReWorksAuthorQueryDTO.ts'
import ReWorksAuthor from '../model/entity/ReWorksAuthor.ts'
import DB from '../database/DB.ts'
import { OriginType } from '../constant/OriginType.js'

/**
 * 作品与作者关联Dao
 */
export default class ReWorksAuthorDao extends BaseDao<ReWorksAuthorQueryDTO, ReWorksAuthor> {
  constructor(db?: DB) {
    super('re_works_author', ReWorksAuthor, db)
  }

  /**
   * 根据作品id和本地作者id删除
   * @param type
   * @param authorIds
   * @param worksId
   */
  public async deleteByWorksIdAndAuthorId(type: OriginType, authorIds: number[], worksId: number): Promise<number> {
    const authorIdsStr = authorIds.join(',')
    let statement: string
    if (OriginType.LOCAL === type) {
      statement = `DELETE FROM ${this.tableName} WHERE works_id = ${worksId} AND local_author_id IN (${authorIdsStr})`
    } else {
      statement = `DELETE FROM ${this.tableName} WHERE works_id = ${worksId} AND site_author_id IN (${authorIdsStr})`
    }
    const db = this.acquire()
    return db.run(statement).then((runResult) => runResult.changes)
  }
}
