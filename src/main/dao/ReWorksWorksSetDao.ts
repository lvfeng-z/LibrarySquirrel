import BaseDao from '../base/BaseDao.ts'
import ReWorksWorksSetQueryDTO from '../model/queryDTO/ReWorksWorksSetQueryDTO.ts'
import ReWorksWorksSet from '../model/entity/ReWorksWorksSet.ts'
import DatabaseClient from '../database/DatabaseClient.ts'

export default class ReWorksWorksSetDao extends BaseDao<ReWorksWorksSetQueryDTO, ReWorksWorksSet> {
  constructor(db: DatabaseClient, injectedDB: boolean) {
    super('re_works_works_set', ReWorksWorksSet, db, injectedDB)
  }
}
