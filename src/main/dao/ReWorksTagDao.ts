import BaseDao from './BaseDao.ts'
import { ReWorksTagQueryDTO } from '../model/queryDTO/ReWorksTagQueryDTO.ts'
import ReWorksTag from '../model/entity/ReWorksTag.ts'
import DB from '../database/DB.ts'
import { OriginType } from '../constant/OriginType.js'

/**
 * 作品与标签关联Dao
 */
export class ReWorksTagDao extends BaseDao<ReWorksTagQueryDTO, ReWorksTag> {
  constructor(db?: DB) {
    super('re_works_tag', ReWorksTag, db)
  }

  /**
   * 根据作品id和本地标签id删除
   * @param type
   * @param tagIds
   * @param worksId
   */
  public async deleteByWorksIdAndTagId(type: OriginType, tagIds: number[], worksId: number): Promise<number> {
    const tagIdsStr = tagIds.join(',')
    let statement: string
    if (OriginType.LOCAL === type) {
      statement = `DELETE FROM ${this.tableName} WHERE works_id = ${worksId} AND local_tag_id IN (${tagIdsStr})`
    } else {
      statement = `DELETE FROM ${this.tableName} WHERE works_id = ${worksId} AND site_tag_id IN (${tagIdsStr})`
    }
    const db = this.acquire()
    return db.run(statement).then((runResult) => runResult.changes)
  }
}
