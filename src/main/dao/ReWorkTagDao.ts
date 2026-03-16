import BaseDao from '../base/BaseDao.ts'
import { ReWorkTagQueryDTO } from '@shared/model/queryDTO/ReWorkTagQueryDTO.ts'
import ReWorkTag from '@shared/model/entity/ReWorkTag.ts'
import { Database } from '../database/Database.ts'
import { OriginType } from '../constant/OriginType.js'

/**
 * 作品与标签关联Dao
 */
export class ReWorkTagDao extends BaseDao<ReWorkTagQueryDTO, ReWorkTag> {
  constructor() {
    super('re_work_tag', ReWorkTag)
  }

  /**
   * 根据作品id和本地标签id删除
   * @param type
   * @param tagIds
   * @param workId
   */
  public async deleteByWorkIdAndTagId(type: OriginType, tagIds: number[], workId: number): Promise<number> {
    const tagIdsStr = tagIds.join(',')
    let statement: string
    if (OriginType.LOCAL === type) {
      statement = `DELETE FROM ${this.tableName} WHERE work_id = ${workId} AND local_tag_id IN (${tagIdsStr})`
    } else {
      statement = `DELETE FROM ${this.tableName} WHERE work_id = ${workId} AND site_tag_id IN (${tagIdsStr})`
    }
    const runResult = await Database.run(statement)
    return runResult.changes
  }
}
