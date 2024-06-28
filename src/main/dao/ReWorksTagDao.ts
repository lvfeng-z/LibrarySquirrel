import BaseDao from './BaseDao.ts'
import { ReWorksTagQueryDTO } from '../model/queryDTO/ReWorksTagQueryDTO.ts'
import ReWorksTag from '../model/ReWorksTag.ts'
import DB from '../database/DB.ts'

/**
 * 作品与标签关联Dao
 */
export class ReWorksTagDao extends BaseDao<ReWorksTagQueryDTO, ReWorksTag> {
  constructor(db?: DB) {
    super('re_works_tag', 'ReWorksTagDao', db)
  }

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
