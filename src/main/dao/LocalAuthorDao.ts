import BaseDao from './BaseDao.ts'
import LocalAuthor from '../model/LocalAuthor.ts'
import LocalAuthorQueryDTO from '../model/queryDTO/LocalAuthorQueryDTO.ts'

/**
 * 本地作者Dao
 */
export default class LocalAuthorDao extends BaseDao<LocalAuthorQueryDTO, LocalAuthor> {
  constructor() {
    super('local_author', 'LocalAuthorDao')
  }

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
