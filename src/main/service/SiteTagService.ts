import SiteTag from '../model/SiteTag.ts'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO.ts'
import SiteTagDao from '../dao/SiteTagDao.ts'
import ApiUtil from '../util/ApiUtil.ts'
import LogUtil from '../util/LogUtil.ts'
import SelectItem from '../model/utilModels/SelectItem.ts'
import StringUtil from '../util/StringUtil.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import BaseService from './BaseService.ts'
import DB from '../database/DB.ts'
import ReWorksTag from '../model/ReWorksTag.ts'
import { ReWorksTagTypeEnum } from '../constant/ReWorksTagTypeEnum.ts'
import { ReWorksTagService } from './ReWorksTagService.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import SiteTagDTO from '../model/dto/SiteTagDTO.ts'
import { isNullish } from '../util/CommonUtil.ts'

/**
 * 站点标签Service
 */
export default class SiteTagService extends BaseService<SiteTagQueryDTO, SiteTag, SiteTagDao> {
  constructor(db?: DB) {
    super('SiteTagService', new SiteTagDao(db), db)
  }

  /**
   * 批量新增或更新
   * @param siteTags
   */
  async saveOrUpdateBatchBySiteTagId(siteTags: SiteTagDTO[]) {
    // TODO 根据dto里存的域名查询站点id
    // 校验
    const target = siteTags.find(
      (siteTag) =>
        siteTag.siteId === undefined ||
        siteTag.siteId === null ||
        siteTag.siteTagId === undefined ||
        siteTag.siteTagId === null
    )
    if (target !== undefined) {
      let msg: string
      if (isNullish(target.siteId)) {
        msg = `批量新增或更新站点标签时，站点id为空，tagName: ${target.siteTagName}`
      } else {
        msg = `批量新增或更新站点标签时，站点中标签的id为空，tagName: ${target.siteTagName}`
      }
      LogUtil.error('SiteTagService', msg)
      throw new Error()
    }

    return super.saveOrUpdateBatchById(siteTags)
  }

  /**
   * 站点标签绑定在本地标签上
   * @param localTagId
   * @param siteTagIds
   */
  async updateBindLocalTag(localTagId: string | null, siteTagIds: string[]) {
    if (localTagId !== undefined) {
      if (siteTagIds != undefined && siteTagIds.length > 0) {
        return ApiUtil.check((await this.dao.updateBindLocalTag(localTagId, siteTagIds)) > 0)
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
  async getBoundOrUnboundInLocalTag(page: PageModel<SiteTagQueryDTO, SiteTag>) {
    // 使用构造函数创建对象，补充缺失的方法和属性
    page = new PageModel(page)
    page.query = new SiteTagQueryDTO(page.query)

    const results = await this.dao.getSiteTagWithLocalTag(page)
    const selectItems = results.map(
      (result) =>
        new SelectItem({
          extraData: undefined,
          label: result.siteTagName,
          rootId: result.baseSiteTagId,
          secondaryLabel: StringUtil.isBlank(result.site?.siteName) ? '?' : result.site?.siteName,
          value: String(result.id)
        })
    )

    const newPage = page.transform<SelectItem>()
    newPage.data = selectItems
    return newPage
  }

  async getSelectList(queryDTO: SiteTagQueryDTO) {
    return await this.dao.getSelectList(queryDTO)
  }

  /**
   * 关联作品和标签
   * @param siteTags
   * @param worksDTO
   */
  async link(siteTags: SiteTag[], worksDTO: WorksDTO) {
    // 创建关联对象
    const links = siteTags.map((siteTag) => {
      const reWorksTag = new ReWorksTag()
      reWorksTag.worksId = worksDTO.id as number
      reWorksTag.siteTagId = siteTag.id
      reWorksTag.tagType = ReWorksTagTypeEnum.SITE
      return reWorksTag
    })

    // 调用reWorksTagService前区分是否为注入式的DB
    let reWorksTagService: ReWorksTagService
    if (this.injectedDB) {
      reWorksTagService = new ReWorksTagService(this.db)
    } else {
      reWorksTagService = new ReWorksTagService()
    }

    return reWorksTagService.saveBatch(links, true)
  }
}
