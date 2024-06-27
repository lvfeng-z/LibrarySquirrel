import Site from '../model/Site.ts'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO.ts'
import BaseDao from './BaseDao.ts'
import DB from '../database/DB.ts'

export default class SiteDao extends BaseDao<SiteQueryDTO, Site> {
  constructor(db?: DB) {
    super('site', 'SiteDao', db)
  }
  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
