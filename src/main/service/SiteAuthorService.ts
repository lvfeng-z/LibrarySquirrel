import BaseService from './BaseService.ts'
import SiteAuthor from '../model/SiteAuthor.ts'
import BaseDao from '../dao/BaseDao.ts'
import SiteAuthorQueryDTO from '../model/queryDTO/SiteAuthorQueryDTO.ts'
import SiteAuthorDao from '../dao/SiteAuthorDao.ts'

/**
 * 站点作者Service
 */
export default class SiteAuthorService extends BaseService<SiteAuthorQueryDTO, SiteAuthor> {
  constructor() {
    super('SiteAuthorService')
  }

  protected getDao(): BaseDao<SiteAuthorQueryDTO, SiteAuthor> {
    return new SiteAuthorDao()
  }
}
