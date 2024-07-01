import BaseDao from './BaseDao.ts'
import WorksSetQueryDTO from '../model/queryDTO/WorksSetQueryDTO.ts'
import WorksSet from '../model/WorksSet.ts'
import DB from '../database/DB.ts'

export default class WorksSetDao extends BaseDao<WorksSetQueryDTO, WorksSet> {
  constructor(db?: DB) {
    super('works_set', 'WorksSetDao', db)
  }

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
