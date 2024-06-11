import BaseService from './BaseService.ts'
import LocalAuthorQueryDTO from '../model/queryDTO/LocalAuthorQueryDTO.ts'
import LocalAuthor from '../model/LocalAuthor.ts'
import BaseDao from '../dao/BaseDao.ts'
import LocalAuthorDao from '../dao/LocalAuthorDao.ts'

/**
 * 本地作者Service
 */
export default class LocalAuthorService extends BaseService<LocalAuthorQueryDTO, LocalAuthor> {
  constructor() {
    super('LocalAuthorService')
  }

  protected getDao(): BaseDao<LocalAuthorQueryDTO, LocalAuthor> {
    return new LocalAuthorDao()
  }
}
