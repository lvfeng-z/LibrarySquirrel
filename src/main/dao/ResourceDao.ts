import BaseDao from '../base/BaseDao.js'
import ResourceQueryDTO from '@shared/model/queryDTO/ResourceQueryDTO.js'
import Resource from '@shared/model/entity/Resource.js'
import { Database } from '../database/Database.js'

/**
 * 资源Dao
 */
export default class ResourceDao extends BaseDao<ResourceQueryDTO, Resource> {
  constructor() {
    super('resource', Resource)
  }

  /**
   * 查询作品id是否有启用的资源
   * @param workId 作品id
   */
  public async hasActiveByWorkId(workId: number): Promise<boolean> {
    const statement = `SELECT COUNT(1) as count FROM ${this.tableName} WHERE work_id = ${workId} AND state = 1`
    const queryResult = (await Database.get(statement)) as { count: number }
    return queryResult.count > 0
  }
}
