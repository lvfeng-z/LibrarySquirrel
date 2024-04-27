import SiteTag from '../model/SiteTag'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO'
import { SiteTagDao } from '../dao/SiteTagDao'
import { ApiUtil } from '../util/ApiUtil'
import LogUtil from '../util/LogUtil'

async function save(siteTag: SiteTag) {
  const dao = new SiteTagDao()
  return await dao.save(siteTag)
}

async function updateById(siteTag: SiteTag) {
  const dao = new SiteTagDao()
  if (siteTag.id != undefined) {
    return ApiUtil.check((await dao.updateById(siteTag.id, siteTag)) > 0)
  } else {
    LogUtil.error('SiteTagService.ts', 'updateById更新时id意外为空')
    return ApiUtil.error('')
  }
}

async function updateBindLocalTag(localTagId: string | null, siteTagIds: string[]) {
  const dao = new SiteTagDao()
  if (siteTagIds.length > 0) {
    return ApiUtil.check((await dao.updateBindLocalTag(localTagId, siteTagIds)) > 0)
  } else {
    return ApiUtil.check(true)
  }
}

function getSelectList(queryDTO: SiteTagQueryDTO) {
  const dao = new SiteTagDao()
  return dao.getSelectList(queryDTO)
}

export default {
  save,
  updateById,
  updateBindLocalTag,
  getSelectList
}
