import SiteTag from '../model/entity/SiteTag.ts'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO.ts'
import SiteTagDao from '../dao/SiteTagDao.ts'
import LogUtil from '../util/LogUtil.ts'
import SelectItem from '../model/util/SelectItem.ts'
import StringUtil from '../util/StringUtil.ts'
import Page from '../model/util/Page.ts'
import BaseService from './BaseService.ts'
import DB from '../database/DB.ts'
import SiteTagDTO from '../model/dto/SiteTagDTO.ts'
import { isNullish, notNullish } from '../util/CommonUtil.ts'
import { assertNotNullish } from '../util/AssertUtil.js'
import { Operator } from '../constant/CrudConstant.js'

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
        siteTag.siteId === undefined || siteTag.siteId === null || siteTag.siteTagId === undefined || siteTag.siteTagId === null
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
        return (await this.dao.updateBindLocalTag(localTagId, siteTagIds)) > 0
      } else {
        return true
      }
    } else {
      LogUtil.error('SiteTagService', '站点标签绑定在本地标签上时，localTagId意外为undefined')
      return false
    }
  }

  /**
   * 查询本地标签绑定或未绑定的站点标签
   * @param page
   */
  async queryBoundOrUnboundToLocalTagPage(page: Page<SiteTagQueryDTO, SiteTag>) {
    assertNotNullish(page.query, this.className, '查询绑定或未绑定在本地标签的站点标签时，查询条件不能为空')
    // 使用构造函数创建对象，补充缺失的方法和属性
    page = new Page(page)

    const tempPage = await this.dao.queryBoundOrUnboundToLocalTagPage(page)
    const selectItems = tempPage.data?.map(
      (siteTagDTO) =>
        new SelectItem({
          extraData: undefined,
          label: siteTagDTO.siteTagName,
          rootId: siteTagDTO.baseSiteTagId,
          subLabels: [StringUtil.isNotBlank(siteTagDTO.site?.siteName) ? siteTagDTO.site?.siteName : '?'],
          value: String(siteTagDTO.id)
        })
    )

    const resultPage = tempPage.transform<SelectItem>()
    resultPage.data = selectItems
    return resultPage
  }

  /**
   * 分页查询作品的站点标签
   * @param page
   */
  public async queryPageByWorksId(page: Page<SiteTagQueryDTO, SiteTag>): Promise<Page<SiteTagQueryDTO, SiteTagDTO>> {
    page = new Page(page)
    if (notNullish(page.query)) {
      page.query.operators = {
        ...{ siteTagName: Operator.LIKE },
        ...page.query.operators
      }
    }
    return await this.dao.queryPageByWorksId(page)
  }

  /**
   * 分页查询作品的站点标签的SelectItem
   * @param page
   */
  public async querySelectItemPageByWorksId(page: Page<SiteTagQueryDTO, SiteTag>): Promise<Page<SiteTagQueryDTO, SelectItem>> {
    page = new Page(page)
    if (notNullish(page.query)) {
      page.query.operators = {
        ...{ siteTagName: Operator.LIKE },
        ...page.query.operators
      }
    }
    const sourcePage = await this.dao.queryPageByWorksId(page)

    // 根据SiteTag数据生成SelectItem
    const sourceData = sourcePage.data
    const resultPage = sourcePage.transform<SelectItem>()
    if (notNullish(sourceData)) {
      resultPage.data = sourceData.map(
        (siteTag) =>
          new SelectItem({
            extraData: undefined,
            label: siteTag.siteTagName,
            rootId: siteTag.baseSiteTagId,
            subLabels: [StringUtil.isNotBlank(siteTag.site?.siteName) ? siteTag.site?.siteName : '?'],
            value: String(siteTag.id)
          })
      )
    }
    return resultPage
  }

  /**
   * 更新最后使用的时间
   * @param ids
   */
  public async updateLastUse(ids: number[]) {
    const entities = ids.map((id) => {
      const temp = new SiteTag()
      temp.id = id
      temp.lastUse = Date.now()
      return temp
    })
    return this.dao.updateBatchById(entities)
  }

  /**
   * 分页查询SelectItem
   * @param page 分页查询参数
   */
  public async querySelectItemPage(page: Page<SiteTagQueryDTO, SiteTag>): Promise<Page<SiteTagQueryDTO, SelectItem>> {
    page = new Page(page)
    if (notNullish(page.query)) {
      page.query.operators = {
        ...{ siteTagName: Operator.LIKE },
        ...page.query.operators
      }
    }
    return this.dao.querySelectItemPage(page)
  }

  /**
   * 根据标签在站点的id及站点id查询
   * @param siteTagIds 标签在站点的id
   * @param siteId 站点id
   */
  public async listBySiteTag(siteTagIds: string[], siteId: number): Promise<SiteTag[]> {
    return this.dao.listBySiteTag(siteTagIds, siteId)
  }
}
