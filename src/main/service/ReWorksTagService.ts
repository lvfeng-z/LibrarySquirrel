import BaseService from './BaseService.ts'
import ReWorksTag from '../model/ReWorksTag.ts'
import { ReWorksTagQueryDTO } from '../model/queryDTO/ReWorksTagQueryDTO.ts'
import { ReWorksTagDao } from '../dao/ReWorksTagDao.ts'
import DB from '../database/DB.ts'

/**
 * 作品与标签关联Service
 */
export class ReWorksTagService extends BaseService<ReWorksTagQueryDTO, ReWorksTag, ReWorksTagDao> {
  constructor(db?: DB) {
    super('ReWorksTagService', new ReWorksTagDao(db), db)
  }
}
