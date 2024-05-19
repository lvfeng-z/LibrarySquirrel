import SiteTag from '../model/SiteTag.ts'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO.ts'
import SiteTagDao from '../dao/SiteTagDao.ts'
import ApiUtil from '../util/ApiUtil.ts'
import LogUtil from '../util/LogUtil.ts'
import SelectItem from '../model/utilModels/SelectItem.ts'
import StringUtil from '../util/StringUtil.ts'
import PageModel from '../model/utilModels/PageModel.ts'

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
  if (localTagId !== undefined) {
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
 * @param page
 */
async function getBoundOrUnboundInLocalTag(page: PageModel<SiteTagQueryDTO, SiteTag>) {
  // 使用构造函数创建对象，补充缺失的方法和属性
  page = new PageModel(page)
  page.query = new SiteTagQueryDTO(page.query)

  const dao = new SiteTagDao()
  const results = await dao.getSiteTagWithLocalTag(page)
  const selectItems = results.map(
    (result) =>
      new SelectItem({
        extraData: undefined,
        label: result.siteTagName,
        rootId: result.baseSiteTagId,
        secondaryLabel: StringUtil.isBlank(result.site.siteName) ? '?' : result.site.siteName,
        value: String(result.id)
      })
  )

  const newPage = page.transform<SelectItem>()
  newPage.data = selectItems
  return ApiUtil.response(newPage)
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
