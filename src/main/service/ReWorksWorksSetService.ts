import BaseService from '../base/BaseService.ts'
import ReWorksWorksSetQueryDTO from '../model/queryDTO/ReWorksWorksSetQueryDTO.ts'
import ReWorksWorksSet from '../model/entity/ReWorksWorksSet.ts'
import ReWorksWorksSetDao from '../dao/ReWorksWorksSetDao.ts'
import DB from '../database/DB.ts'

export default class ReWorksWorksSetService extends BaseService<ReWorksWorksSetQueryDTO, ReWorksWorksSet, ReWorksWorksSetDao> {
  constructor(db?: DB) {
    super(ReWorksWorksSetDao, db)
  }
}
