import SiteTag from '../model/entity/SiteTag.ts'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO.ts'
import SiteTagDao from '../dao/SiteTagDao.ts'
import LogUtil from '../util/LogUtil.ts'
import SelectItem from '../model/util/SelectItem.ts'
import StringUtil from '../util/StringUtil.ts'
import Page from '../model/util/Page.ts'
import BaseService from '../base/BaseService.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import SiteTagFullDTO from '../model/dto/SiteTagFullDTO.ts'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish, NotNullish } from '../util/CommonUtil.ts'
import { AssertNotBlank, AssertNotNullish } from '../util/AssertUtil.js'
import { Operator, SAVE_FAILED } from '../constant/CrudConstant.js'
import SiteService from './SiteService.js'
import SiteTagPluginDTO from '../model/dto/SiteTagPluginDTO.js'
import SiteTagLocalRelateDTO from '../model/dto/SiteTagLocalRelateDTO.js'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO.js'
import LocalTag from '../model/entity/LocalTag.js'
import LocalTagService from './LocalTagService.js'

/**
 * 站点标签Service
 */
export default class SiteTagService extends BaseService<SiteTagQueryDTO, SiteTag, SiteTagDao> {
  constructor(db?: DatabaseClient) {
    super(SiteTagDao, db)
  }

  /**
   * 批量新增或更新
   * @param siteTags
   */
  public async saveOrUpdateBatchBySiteTagId(siteTags: SiteTagFullDTO[]) {
    const tempParam = siteTags
      .map((siteTag) => {
        if (IsNullish(siteTag.siteTagId) || IsNullish(siteTag.siteId)) {
          return
        }
        return { siteTagId: siteTag.siteTagId, siteId: siteTag.siteId }
      })
      .filter(NotNullish)
    if (ArrayIsEmpty(tempParam)) {
      return SAVE_FAILED
    }
    const oldSiteTags = await this.listBySiteTag(tempParam)
    const newSiteTags = siteTags.map((siteTag) => {
      AssertNotNullish(siteTag.siteTagId, this.constructor.name, '保存站点标签失败，站点标签的id不能为空')
      AssertNotNullish(siteTag.siteId, this.constructor.name, '保存站点标签失败，站点标签的站点id不能为空')
      const oldSiteTag = oldSiteTags.find((oldSiteTag) => oldSiteTag.siteTagId === siteTag.siteTagId)
      const newSiteTag = new SiteTag(siteTag)

      if (oldSiteTag !== undefined) {
        // 调整新数据
        newSiteTag.id = oldSiteTag.id
        newSiteTag.createTime = undefined
        newSiteTag.updateTime = undefined
      }
      return newSiteTag
    })
    return super.saveOrUpdateBatchById(newSiteTags, [['site_id', 'site_tag_id']])
  }

  /**
   * 创建同名的本地标签
   * @param siteTagName
   */
  public async createSameNameLocalTag(siteTagName: string): Promise<number> {
    const localTagService = new LocalTagService(this.db)
    // 查询是否已有同名标签
    const localTagQuery = new LocalTagQueryDTO()
    localTagQuery.localTagName = siteTagName
    const sameNameLocalTags = await localTagService.list(localTagQuery)
    if (ArrayNotEmpty(sameNameLocalTags)) {
      return sameNameLocalTags[0].id as number
    }
    // 新增同名标签
    const newLocalTag = new LocalTag()
    newLocalTag.localTagName = siteTagName
    return localTagService.save(newLocalTag)
  }

  /**
   * 创建并绑定同名的本地标签
   * @param siteTag
   */
  public async createAndBindSameNameLocalTag(siteTag: SiteTag): Promise<boolean> {
    const siteTagName = siteTag.siteTagName
    AssertNotNullish(siteTag.id, this.constructor.name, '创建同名本地标签失败，标签名称不能为空')
    AssertNotBlank(siteTagName, this.constructor.name, '创建同名本地标签失败，标签名称不能为空')
    const localTagId = await this.createSameNameLocalTag(siteTagName)
    return this.updateBindLocalTag(localTagId, [siteTag.id])
  }

  /**
   * 站点标签绑定在本地标签上
   * @param localTagId
   * @param siteTagIds
   */
  public async updateBindLocalTag(localTagId: number, siteTagIds: number[]) {
    if (localTagId !== undefined) {
      if (siteTagIds != undefined && siteTagIds.length > 0) {
        return (await this.dao.updateBindLocalTag(localTagId, siteTagIds)) > 0
      } else {
        return true
      }
    } else {
      LogUtil.error('SiteTagService', '站点标签绑定在本地标签上失败，localTagId不能为空')
      return false
    }
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
   * 查询本地标签绑定或未绑定的站点标签
   * @param page
   */
  public async queryBoundOrUnboundToLocalTagPage(page: Page<SiteTagQueryDTO, SiteTag>) {
    AssertNotNullish(page.query, this.constructor.name, '查询绑定或未绑定在本地标签的站点标签失败，查询条件不能为空')
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
   * 查询作品的站点标签
   * @param worksId
   */
  public async listByWorksId(worksId: number): Promise<SiteTag[]> {
    return await this.dao.listByWorksId(worksId)
  }

  /**
   * 查询作品的站点标签DTO
   * @param worksId
   */
  public async listDTOByWorksId(worksId: number): Promise<SiteTagFullDTO[]> {
    return await this.dao.listDTOByWorksId(worksId)
  }

  /**
   * 分页查询
   * @param page
   */
  public async queryPage(page: Page<SiteTagQueryDTO, SiteTag>): Promise<Page<SiteTagQueryDTO, SiteTag>> {
    try {
      page = new Page(page)
      if (NotNullish(page.query)) {
        page.query.operators = {
          ...{ siteTagName: Operator.LIKE },
          ...page.query.operators
        }
      }
      return super.queryPage(page)
    } catch (error) {
      LogUtil.error(this.constructor.name, error)
      throw error
    }
  }

  /**
   * 分页查询作品的站点标签
   * @param page
   */
  public async queryPageByWorksId(page: Page<SiteTagQueryDTO, SiteTag>): Promise<Page<SiteTagQueryDTO, SiteTagFullDTO>> {
    page = new Page(page)
    if (NotNullish(page.query)) {
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
    if (NotNullish(page.query)) {
      page.query.operators = {
        ...{ siteTagName: Operator.LIKE },
        ...page.query.operators
      }
    }
    const sourcePage = await this.dao.queryPageByWorksId(page)

    // 根据SiteTag数据生成SelectItem
    const sourceData = sourcePage.data
    const resultPage = sourcePage.transform<SelectItem>()
    if (NotNullish(sourceData)) {
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
   * 分页查询SelectItem
   * @param page 分页查询参数
   */
  public async querySelectItemPage(page: Page<SiteTagQueryDTO, SiteTag>): Promise<Page<SiteTagQueryDTO, SelectItem>> {
    page = new Page(page)
    if (NotNullish(page.query)) {
      page.query.operators = {
        ...{ siteTagName: Operator.LIKE },
        ...page.query.operators
      }
    }
    return this.dao.querySelectItemPage(page)
  }

  /**
   * 分页查询
   * @param page
   */
  public async queryLocalRelateDTOPage(page: Page<SiteTagQueryDTO, SiteTag>): Promise<Page<SiteTagQueryDTO, SiteTagLocalRelateDTO>> {
    try {
      page = new Page(page)
      if (NotNullish(page.query)) {
        page.query.operators = {
          ...{ siteTagName: Operator.LIKE },
          ...page.query.operators
        }
      }
      return this.dao.queryLocalRelateDTOPage(page)
    } catch (error) {
      LogUtil.error(this.constructor.name, error)
      throw error
    }
  }

  /**
   * 根据标签在站点的id及站点id查询
   * @param siteTags 站点标签
   */
  public async listBySiteTag(siteTags: { siteTagId: string; siteId: number }[]): Promise<SiteTag[]> {
    if (ArrayIsEmpty(siteTags)) {
      return []
    }
    return this.dao.listBySiteTag(siteTags)
  }

  /**
   * 生成用于保存的站点标签信息
   */
  public static async createSaveInfosFromPlugin(siteTags: SiteTagPluginDTO[]): Promise<SiteTagFullDTO[]> {
    const result: SiteTagFullDTO[] = []
    const siteService = new SiteService()
    // 用于查询和缓存站点id
    const siteCache = new Map<string, Promise<number>>()
    for (const siteTag of siteTags) {
      if (IsNullish(siteTag.siteDomain)) {
        result.push(new SiteTagFullDTO(siteTag))
        continue
      }
      let siteIdPromise: Promise<number | null | undefined> | null | undefined = siteCache.get(siteTag.siteDomain)
      if (IsNullish(siteIdPromise)) {
        const tempSite = siteService.getByDomain(siteTag.siteDomain)
        siteIdPromise = tempSite.then((site) => site?.id)
      }
      const siteId = await siteIdPromise
      if (IsNullish(siteId)) {
        result.push(new SiteTagFullDTO(siteTag))
        continue
      }
      const tempDTO = new SiteTagFullDTO(siteTag)
      tempDTO.siteId = siteId
      result.push(tempDTO)
    }
    return result
  }
}
