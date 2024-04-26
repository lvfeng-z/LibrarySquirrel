import SiteTag from '../models/SiteTag'
import SiteTagDao from '../dao/SiteTagDao'
import SiteTagQueryDTO from '../models/queryDTO/SiteTagQueryDTO'
import { SiteTagDaoTest } from '../dao/SiteTagDaoTest'
import { ApiUtil } from '../util/ApiUtil'
import LogUtil from '../util/LogUtil'

async function save(siteTag: SiteTag) {
  const dao = new SiteTagDaoTest()
  return await dao.save(siteTag)
}

async function updateById(siteTag: SiteTag) {
  const dao = new SiteTagDaoTest()
  if (siteTag.id != undefined) {
    return ApiUtil.check((await dao.updateById(siteTag.id, siteTag)) > 0)
  } else {
    LogUtil.error('SiteTagService.ts', 'updateById更新时id意外为空')
    return ApiUtil.error('')
  }
}

function getSelectList(queryDTO: SiteTagQueryDTO) {
  return SiteTagDao.getSelectList(queryDTO)
}

export default {
  save,
  updateById,
  getSelectList
}
