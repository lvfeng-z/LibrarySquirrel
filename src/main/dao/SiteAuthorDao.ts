import BaseDao from './BaseDao.ts'
import SiteAuthorQueryDTO from '../model/queryDTO/SiteAuthorQueryDTO.ts'
import SiteAuthor from '../model/SiteAuthor.ts'

/**
 * 站点作者Dao
 */
export default class SiteAuthorDao extends BaseDao<SiteAuthorQueryDTO, SiteAuthor> {
  constructor() {
    super('site_author', 'SiteAuthorDao')
  }

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
