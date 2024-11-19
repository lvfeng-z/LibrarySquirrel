import BaseService from './BaseService.ts'
import ReWorksAuthorQueryDTO from '../model/queryDTO/ReWorksAuthorQueryDTO.ts'
import ReWorksAuthor from '../model/ReWorksAuthor.ts'
import DB from '../database/DB.ts'
import ReWorksAuthorDao from '../dao/ReWorksAuthorDao.ts'

export default class ReWorksAuthorService extends BaseService<ReWorksAuthorQueryDTO, ReWorksAuthor, ReWorksAuthorDao> {
  constructor(db?: DB) {
    super('ReWorksAuthorService', new ReWorksAuthorDao(db), db)
  }
}
