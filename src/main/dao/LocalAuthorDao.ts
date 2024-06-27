import BaseDao from './BaseDao.ts'
import LocalAuthor from '../model/LocalAuthor.ts'
import LocalAuthorQueryDTO from '../model/queryDTO/LocalAuthorQueryDTO.ts'
import DB from '../database/DB.ts'

/**
 * 本地作者Dao
 */
export default class LocalAuthorDao extends BaseDao<LocalAuthorQueryDTO, LocalAuthor> {
  constructor(db?: DB) {
    super('local_author', 'LocalAuthorDao', db)
  }

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
