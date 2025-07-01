import BaseDao from '../base/BaseDao.js'
import ResourceQueryDTO from '../model/queryDTO/ResourceQueryDTO.js'
import Resource from '../model/entity/Resource.js'
import DB from '../database/DB.js'

/**
 * 资源Dao
 */
export default class ResourceDao extends BaseDao<ResourceQueryDTO, Resource> {
  constructor(db: DB, injectedDB: boolean) {
    super('resource', Resource, db, injectedDB)
  }

  /**
   * 查询作品id是否有启用的资源
   * @param worksId
   */
  public async hasActiveByWorksId(worksId: number): Promise<boolean> {
    const statement = `SELECT COUNT(1) FROM ${this.tableName} WHERE works_id1 = ${worksId} AND state = 1`
    const db = this.acquire()
    try {
      const count = (await db.get(statement)) as number
      return count > 0
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }
}
