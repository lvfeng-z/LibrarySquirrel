import Site from '../models/Site'
import SiteDao from '../dao/SiteDao'
import SiteQueryDTO from '../models/queryDTO/SiteQueryDTO'

async function insert(site: Site) {
  await SiteDao.insert(site)
}

function getSelectList(queryDTO: SiteQueryDTO) {
  return SiteDao.getSelectList(queryDTO)
}

export default {
  insert,
  getSelectList
}
