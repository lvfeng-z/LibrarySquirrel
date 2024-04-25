import SiteTag from '../models/SiteTag'
import SiteTagDao from '../dao/SiteTagDao'
import SiteTagQueryDTO from '../models/queryDTO/SiteTagQueryDTO'
import { SiteTagDaoTest } from '../dao/SiteTagDaoTest'

async function save(siteTag: SiteTag) {
  const dao = new SiteTagDaoTest()
  return dao.save(siteTag)
}

async function insert(siteTag: SiteTag) {
  await SiteTagDao.insert(siteTag)
}

function getSelectList(queryDTO: SiteTagQueryDTO) {
  return SiteTagDao.getSelectList(queryDTO)
}

export default {
  save,
  insert,
  getSelectList
}
