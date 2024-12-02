import BaseDao from './BaseDao.ts'
import { ReWorksTagQueryDTO } from '../model/queryDTO/ReWorksTagQueryDTO.ts'
import ReWorksTag from '../model/entity/ReWorksTag.ts'
import DB from '../database/DB.ts'

/**
 * 作品与标签关联Dao
 */
export class ReWorksTagDao extends BaseDao<ReWorksTagQueryDTO, ReWorksTag> {
  constructor(db?: DB) {
    super('re_works_tag', 'ReWorksTagDao', db)
  }

  /**
   * 根据作品id和本地标签id删除
   * @param localTagIds
   * @param worksId
   */
  public async deleteByWorksIdAndLocalTagId(localTagIds: number[], worksId: number): Promise<number> {
    const localTagIdsStr = localTagIds.join(',')
    const statement = `DELETE FROM ${this.tableName} WHERE works_id = ${worksId} AND local_tag_id IN (${localTagIdsStr})`
    const db = this.acquire()
    return db.run(statement).then((runResult) => runResult.changes)
  }
}
