import BaseDao from '../base/BaseDao.ts'
import ReWorkWorkSetQueryDTO from '../model/queryDTO/ReWorkWorkSetQueryDTO.ts'
import ReWorkWorkSet from '../model/entity/ReWorkWorkSet.ts'
import DatabaseClient from '../database/DatabaseClient.ts'

export default class ReWorkWorkSetDao extends BaseDao<ReWorkWorkSetQueryDTO, ReWorkWorkSet> {
  constructor(db: DatabaseClient, injectedDB: boolean) {
    super('re_work_work_set', ReWorkWorkSet, db, injectedDB)
  }
}
