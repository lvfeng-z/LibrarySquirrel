import BaseDao from './BaseDao.ts'
import DB from '../database/DB.ts'
import SiteDomain from '../model/entity/SiteDomain.js'
import SiteDomainQueryDTO from '../model/queryDTO/SiteDomainQueryDTO.js'

export default class SiteDomainDao extends BaseDao<SiteDomainQueryDTO, SiteDomain> {
  constructor(db?: DB) {
    super('site_domain', 'SiteDomainDao', db)
  }
}
