import BaseDao from '../base/BaseDao.ts'
import ReWorkWorkSetQueryDTO from '@shared/model/queryDTO/ReWorkWorkSetQueryDTO.ts'
import ReWorkWorkSet from '@shared/model/entity/ReWorkWorkSet.ts'

export default class ReWorkWorkSetDao extends BaseDao<ReWorkWorkSetQueryDTO, ReWorkWorkSet> {
  constructor() {
    super('re_work_work_set', ReWorkWorkSet)
  }
}
