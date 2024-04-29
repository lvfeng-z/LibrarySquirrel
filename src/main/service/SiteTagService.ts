import SiteTag from '../model/SiteTag'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO'
import { SiteTagDao } from '../dao/SiteTagDao'
import { ApiUtil } from '../util/ApiUtil'
import LogUtil from '../util/LogUtil'
import SelectVO from '../model/utilModels/SelectVO'

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
// todo 渲染进程传入null时，此处变成undefined
async function updateBindLocalTag(localTagId: string | null, siteTagIds: string[]) {
  const dao = new SiteTagDao()
  if (localTagId != undefined) {
    if (siteTagIds != undefined && siteTagIds.length > 0) {
      return ApiUtil.check((await dao.updateBindLocalTag(localTagId, siteTagIds)) > 0)
    } else {
      return ApiUtil.check(true)
    }
  } else {
    LogUtil.error('SiteTagService', 'localTagId意外为undefined')
    return ApiUtil.error('localTagId意外为undefined')
  }
}

/**
 * 查询本地标签绑定或未绑定的站点标签
 * @param queryDTO
 */
async function getBoundOrUnboundInLocalTag(queryDTO: SiteTagQueryDTO) {
  // 传入的参数没有经过构造函数，导致需要的方法和属性不完整，在此重建
  queryDTO = new SiteTagQueryDTO(queryDTO)

  const dao = new SiteTagDao()
  const results = await dao.getSiteTagWithLocalTag(queryDTO)
  const response = results.map(
    (result) =>
      new SelectVO({
        extraData: undefined,
        label: result.siteTagName,
        rootId: result.baseSiteTagId,
        secondaryLabel: String(result.siteId),
        value: String(result.id)
      })
  )
  return ApiUtil.response(response)
}

async function getSelectList(queryDTO: SiteTagQueryDTO) {
  const dao = new SiteTagDao()
  return await dao.getSelectList(queryDTO)
}

export default {
  save,
  updateById,
  updateBindLocalTag,
  getBoundOrUnboundInLocalTag,
  getSelectList
}
