import BaseDao from '../base/BaseDao.js'
import ResourceQueryDTO from '../model/queryDTO/ResourceQueryDTO.js'
import Resource from '../model/entity/Resource.js'
import DB from '../database/DB.js'

/**
 * 资源Dao
 */
export default class ResourceDao extends BaseDao<ResourceQueryDTO, Resource> {
  constructor(db?: DB) {
    super('resource', Resource, db)
  }
}
