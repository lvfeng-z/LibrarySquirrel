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

  /**
   * 根据站点作者Id列表查询
   * @param siteAuthorIs
   */
  async selectListBySiteAuthorIds(siteAuthorIs: string[]) {
    const db = this.acquire()
    try {
      const statement = `SELECT * FROM "${this.tableName}" WHERE site_author_id in ${siteAuthorIs.join(',')}`
      const rows = (await db.prepare(statement)).all() as object[]
      return this.getResultTypeDataList<SiteAuthor>(rows)
    } finally {
      db.release()
    }
  }

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
