import BaseDao from '../base/BaseDao.js'
import ResourceQueryDTO from '../model/queryDTO/ResourceQueryDTO.js'
import Resource from '../model/entity/Resource.js'
import DatabaseClient from '../database/DatabaseClient.js'

/**
 * 资源Dao
 */
export default class ResourceDao extends BaseDao<ResourceQueryDTO, Resource> {
  constructor(db: DatabaseClient, injectedDB: boolean) {
    super('resource', Resource, db, injectedDB)
  }

  /**
   * 查询作品id是否有启用的资源
   * @param workId 作品id
   */
  public async hasActiveByWorkId(workId: number): Promise<boolean> {
    const statement = `SELECT COUNT(1) as count FROM ${this.tableName} WHERE work_id = ${workId} AND state = 1`
    const db = this.acquire()
    try {
      const queryResult = (await db.get(statement)) as { count: number }
      return queryResult.count > 0
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }
}
