import SiteTag from '../models/SiteTag'
import SiteTagDao from '../dao/SiteTagDao'
import SiteTagQueryDTO from '../models/queryDTO/SiteTagQueryDTO'

async function insert(siteTag: SiteTag) {
  await SiteTagDao.insert(siteTag)
}

function getSelectList(queryDTO: SiteTagQueryDTO) {
  return SiteTagDao.getSelectList(queryDTO)
}

export default {
  insert,
  getSelectList
}
