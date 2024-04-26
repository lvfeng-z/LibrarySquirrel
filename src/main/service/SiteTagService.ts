import SiteTag from '../models/SiteTag'
import SiteTagDao from '../dao/SiteTagDao'
import SiteTagQueryDTO from '../models/queryDTO/SiteTagQueryDTO'
import { SiteTagDaoTest } from '../dao/SiteTagDaoTest'

async function save(siteTag: SiteTag) {
  const dao = new SiteTagDaoTest()
  return await dao.save(siteTag)
}

async function updateById(siteTag: SiteTag) {
  console.log('SiteTagService.ts.updateById', siteTag)
  const dao = new SiteTagDaoTest()
  return await dao.updateById(siteTag.id, siteTag)
}

function getSelectList(queryDTO: SiteTagQueryDTO) {
  return SiteTagDao.getSelectList(queryDTO)
}

export default {
  save,
  updateById,
  getSelectList
}
