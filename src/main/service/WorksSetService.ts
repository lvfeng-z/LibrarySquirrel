import BaseService from './BaseService.ts'
import WorksSet from '../model/WorksSet.ts'
import WorksSetQueryDTO from '../model/queryDTO/WorksSetQueryDTO.ts'
import DB from '../database/DB.ts'
import WorksSetDao from '../dao/WorksSetDao.ts'

/**
 * 作品集Service
 */
export default class WorksSetService extends BaseService<WorksSetQueryDTO, WorksSet, WorksSetDao> {
  constructor(db?: DB) {
    super('WorksSetService', new WorksSetDao(db), db)
  }
}
