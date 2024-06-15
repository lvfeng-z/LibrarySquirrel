import Site from '../model/Site.ts'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO.ts'
import BaseDao from './BaseDao.ts'

export default class SiteDao extends BaseDao<SiteQueryDTO, Site> {
  constructor() {
    super('site', 'SiteDao')
  }
  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
