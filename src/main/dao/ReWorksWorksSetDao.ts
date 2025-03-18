import BaseDao from '../base/BaseDao.ts'
import ReWorksWorksSetQueryDTO from '../model/queryDTO/ReWorksWorksSetQueryDTO.ts'
import ReWorksWorksSet from '../model/entity/ReWorksWorksSet.ts'
import DB from '../database/DB.ts'

export default class ReWorksWorksSetDao extends BaseDao<ReWorksWorksSetQueryDTO, ReWorksWorksSet> {
  constructor(db: DB, injectedDB: boolean) {
    super('re_works_works_set', ReWorksWorksSet, db, injectedDB)
  }
}
