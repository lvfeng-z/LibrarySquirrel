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

async function updateBindLocalTag(localTagId: string | null, siteTagIds: string[]) {
  const dao = new SiteTagDao()
  if (siteTagIds.length > 0) {
    return ApiUtil.check((await dao.updateBindLocalTag(localTagId, siteTagIds)) > 0)
  } else {
    return ApiUtil.check(true)
  }
}

/**
 * 查询本地标签绑定或未绑定的站点标签
 * @param params localTagId 本地标签id，state 是否绑定（true：绑定的，false：未绑定的）
 */
async function getBoundOrUnboundInLocalTag(params: {
  localTagId: number | undefined
  state: boolean | undefined
}) {
  const queryDTO = new SiteTagQueryDTO({
    keyword: undefined,
    localTagId: params.localTagId,
    bound: params.state
  })
  const dao = new SiteTagDao()
  const results = await dao.getSiteTagWithLocalTag(queryDTO)
  return results.map(
    (result) =>
      new SelectVO({
        extraData: undefined,
        label: result.siteTagName,
        rootId: result.baseSiteTagId,
        secondaryLabel: String(result.siteId),
        value: String(result.id)
      })
  )
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
