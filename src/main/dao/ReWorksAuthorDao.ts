import BaseDao from './BaseDao.ts'
import ReWorksAuthorQueryDTO from '../model/queryDTO/ReWorksAuthorQueryDTO.ts'
import ReWorksAuthor from '../model/ReWorksAuthor.ts'
import DB from '../database/DB.ts'

/**
 * 作品与作者关联Dao
 */
export default class ReWorksAuthorDao extends BaseDao<ReWorksAuthorQueryDTO, ReWorksAuthor> {
  constructor(db?: DB) {
    super('re_works_author', 'ReWorksAuthorDao', db)
  }
}
