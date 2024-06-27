import BaseDao from './BaseDao.ts'
import SiteAuthorQueryDTO from '../model/queryDTO/SiteAuthorQueryDTO.ts'
import SiteAuthor from '../model/SiteAuthor.ts'
import DB from '../database/DB.ts'

/**
 * 站点作者Dao
 */
export default class SiteAuthorDao extends BaseDao<SiteAuthorQueryDTO, SiteAuthor> {
  constructor(db?: DB) {
    super('site_author', 'SiteAuthorDao', db)
  }

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
