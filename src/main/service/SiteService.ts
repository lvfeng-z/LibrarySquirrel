import Site from '../model/Site'
import { SiteDao } from '../dao/SiteDao'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO'

async function insert(site: Site) {
  const dao = new SiteDao()
  await dao.insert(site)
}

function getSelectList(queryDTO: SiteQueryDTO) {
  const dao = new SiteDao()
  return dao.getSelectList(queryDTO)
}

export default {
  insert,
  getSelectList
}
