import BaseService from './BaseService.ts'
import SiteAuthor from '../model/entity/SiteAuthor.ts'
import SiteAuthorQueryDTO from '../model/queryDTO/SiteAuthorQueryDTO.ts'
import SiteAuthorDao from '../dao/SiteAuthorDao.ts'
import StringUtil from '../util/StringUtil.ts'
import LogUtil from '../util/LogUtil.ts'
import lodash from 'lodash'
import DB from '../database/DB.ts'
import { IsNullish, NotNullish } from '../util/CommonUtil.ts'
import Page from '../model/util/Page.ts'
import SelectItem from '../model/util/SelectItem.ts'
import { Operator } from '../constant/CrudConstant.js'
import { AssertNotNullish } from '../util/AssertUtil.js'
import SiteService from './SiteService.js'
import SiteAuthorPluginDTO from '../model/dto/SiteAuthorPluginDTO.js'
import SiteAuthorDTO from '../model/dto/SiteAuthorDTO.js'

/**
 * 站点作者Service
 */
export default class SiteAuthorService extends BaseService<SiteAuthorQueryDTO, SiteAuthor, SiteAuthorDao> {
  constructor(db?: DB) {
    super(SiteAuthorDao, db)
  }

  /**
   * 基于站点作者id保存或更新站点作者
   * @param siteAuthor
   */
  public async saveOrUpdateBySiteAuthorId(siteAuthor: SiteAuthor): Promise<number> {
    if (IsNullish(siteAuthor.siteId)) {
      const msg = '保存作品失败，作品的站点id意外为空'
      LogUtil.error('SiteAuthorService', msg)
      throw new Error(msg)
    } else if (IsNullish(siteAuthor.siteAuthorId)) {
      const msg = '保存作品失败，站点作者的id意外为空'
      LogUtil.error('SiteAuthorService', '保存作品失败，站点作者的id意外为空')
      throw new Error(msg)
    } else {
      const oldSiteAuthor = await this.getBySiteAuthorId(siteAuthor.siteAuthorId, siteAuthor.siteId)
      const newSiteAuthor = lodash.cloneDeep(siteAuthor)

      if (oldSiteAuthor !== undefined) {
        // 调整新数据
        newSiteAuthor.id = oldSiteAuthor.id
        newSiteAuthor.siteAuthorNameBefore = oldSiteAuthor.siteAuthorNameBefore
        newSiteAuthor.createTime = undefined
        newSiteAuthor.updateTime = undefined
        // 如果站点作者的名称变更，对原本的名称写入到siteAuthorNameBefore
        if (
          newSiteAuthor.siteAuthorName !== oldSiteAuthor.siteAuthorName &&
          oldSiteAuthor.siteAuthorName !== undefined &&
          oldSiteAuthor.siteAuthorName !== null
        ) {
          ;(newSiteAuthor.siteAuthorNameBefore as string[]).push(oldSiteAuthor.siteAuthorName)
        }
        return await this.updateById(newSiteAuthor)
      } else {
        await this.save(newSiteAuthor)
        return 1
      }
    }
  }

  /**
   * 基于站点作者id批量保存或更新站点作者
   * @param siteAuthors
   */
  public async saveOrUpdateBatchBySiteAuthorId(siteAuthors: SiteAuthor[]): Promise<number> {
    const siteAuthorIds = siteAuthors.map((siteAuthor) => siteAuthor.siteAuthorId) as string[]
    const oldSiteAuthors = await this.dao.listBySiteAuthorIds(siteAuthorIds)
    const newSiteAuthors = siteAuthors.map((siteAuthor) => {
      AssertNotNullish(siteAuthor.siteAuthorId, this.constructor.name, '保存站点作者失败，站点作者的id意外为空')
      AssertNotNullish(siteAuthor.siteId, this.constructor.name, '保存站点作者失败，站点作者的站点id意外为空')
      const oldSiteAuthor = oldSiteAuthors.find((oldSiteAuthor) => oldSiteAuthor.siteAuthorId === siteAuthor.siteAuthorId)
      const newSiteAuthor = new SiteAuthor(siteAuthor)

      if (oldSiteAuthor !== undefined) {
        // 调整新数据
        newSiteAuthor.id = oldSiteAuthor.id
        newSiteAuthor.siteAuthorNameBefore = oldSiteAuthor.siteAuthorNameBefore
        newSiteAuthor.createTime = undefined
        newSiteAuthor.updateTime = undefined
        // 如果站点作者的名称变更，对原本的名称写入到siteAuthorNameBefore
        if (
          newSiteAuthor.siteAuthorName !== oldSiteAuthor.siteAuthorName &&
          oldSiteAuthor.siteAuthorName !== undefined &&
          oldSiteAuthor.siteAuthorName !== null
        ) {
          ;(newSiteAuthor.siteAuthorNameBefore as string[]).push(oldSiteAuthor.siteAuthorName)
        }
      }
      return newSiteAuthor
    })
    return super.saveOrUpdateBatchById(newSiteAuthors)
  }

  /**
   * 站点作者绑定在本地作者上
   * @param localAuthorId
   * @param siteAuthorIds
   */
  async updateBindLocalAuthor(localAuthorId: string | null, siteAuthorIds: string[]) {
    if (localAuthorId !== undefined) {
      if (siteAuthorIds != undefined && siteAuthorIds.length > 0) {
        return (await this.dao.updateBindLocalAuthor(localAuthorId, siteAuthorIds)) > 0
      } else {
        return true
      }
    } else {
      LogUtil.error('SiteAuthorService', '站点作者绑定在本地作者上失败，localAuthorId意外为undefined')
      return false
    }
  }

  /**
   * 查询本地作者绑定或未绑定的站点作者
   * @param page
   */
  async queryBoundOrUnboundInLocalAuthorPage(page: Page<SiteAuthorQueryDTO, SiteAuthor>) {
    // 使用构造函数创建对象，补充缺失的方法和属性
    page = new Page(page)

    const tempPage = await this.dao.querySiteAuthorWithLocalAuthorPage(page)
    const selectItems = tempPage.data?.map(
      (siteAuthorDTO) =>
        new SelectItem({
          extraData: undefined,
          label: siteAuthorDTO.siteAuthorName,
          rootId: undefined,
          subLabels: [StringUtil.isNotBlank(siteAuthorDTO.site?.siteName) ? siteAuthorDTO.site?.siteName : '?'],
          value: String(siteAuthorDTO.id)
        })
    )

    const resultPage = tempPage.transform<SelectItem>()
    resultPage.data = selectItems
    return resultPage
  }

  /**
   * 更新最后使用的时间
   * @param ids
   */
  public async updateLastUse(ids: number[]) {
    const entities = ids.map((id) => {
      const temp = new SiteAuthor()
      temp.id = id
      temp.lastUse = Date.now()
      return temp
    })
    return this.dao.updateBatchById(entities)
  }

  /**
   * 根据站点作者id和站点id查询站点作者
   * @param siteAuthorId
   * @param siteId
   */
  public async getBySiteAuthorId(siteAuthorId: string, siteId: number): Promise<SiteAuthor | undefined> {
    if (StringUtil.isNotBlank(siteAuthorId)) {
      const queryDTO = new SiteAuthorQueryDTO()
      queryDTO.siteAuthorId = siteAuthorId
      queryDTO.siteId = siteId
      queryDTO.sort = { createTime: false }

      const siteAuthors = await this.dao.list(queryDTO)
      if (siteAuthors.length === 1) {
        return siteAuthors[0]
      }
      if (siteAuthors.length > 1) {
        LogUtil.warn('SiteAuthorService', `站点作者id：${siteAuthorId}在数据库中存在多个作者`)
        return siteAuthors[0]
      }
      return undefined
    } else {
      const msg = '根据站点作者id查询站点作者时站点作者id意外为空'
      LogUtil.error('SiteAuthorService', msg)
      throw new Error(msg)
    }
  }

  /**
   * 分页查询SelectItem
   * @param page 分页查询参数
   */
  public async querySelectItemPage(page: Page<SiteAuthorQueryDTO, SiteAuthor>): Promise<Page<SiteAuthorQueryDTO, SelectItem>> {
    page = new Page(page)
    if (NotNullish(page.query)) {
      page.query.operators = {
        ...{ siteAuthorName: Operator.LIKE },
        ...page.query.operators
      }
    }
    return this.dao.querySelectItemPage(page)
  }

  /**
   * 根据作者在站点的id及站点id查询
   * @param siteAuthorIds 作者在站点的id
   * @param siteId 站点id
   */
  public async listBySiteAuthor(siteAuthorIds: string[], siteId: number): Promise<SiteAuthor[]> {
    return this.dao.listBySiteAuthor(siteAuthorIds, siteId)
  }

  /**
   * 查询作品的站点作者
   * @param worksId 作品id
   */
  public async listByWorksId(worksId: number) {
    return this.dao.listByWorksId(worksId)
  }

  /**
   * 生成用于保存的站点作者信息
   */
  public static async createSaveInfos(siteAuthors: SiteAuthorPluginDTO[]): Promise<SiteAuthorDTO[]> {
    const result: SiteAuthorDTO[] = []
    // 用于查询和缓存站点id
    const siteService = new SiteService()
    const siteCache = new Map<string, Promise<number>>()
    for (const siteAuthor of siteAuthors) {
      if (IsNullish(siteAuthor.siteDomain)) {
        result.push(new SiteAuthorDTO(siteAuthor))
        continue
      }
      let siteIdPromise: Promise<number | null | undefined> | null | undefined = siteCache.get(siteAuthor.siteDomain)
      if (IsNullish(siteIdPromise)) {
        const tempSite = siteService.getByDomain(siteAuthor.siteDomain)
        siteIdPromise = tempSite.then((site) => site?.id)
      }
      const siteId = await siteIdPromise
      if (IsNullish(siteId)) {
        result.push(new SiteAuthorDTO(siteAuthor))
        continue
      }
      const tempDTO = new SiteAuthorDTO(siteAuthor)
      tempDTO.siteId = siteId
      tempDTO.authorRole = siteAuthor.authorRole
      result.push(tempDTO)
    }
    return result
  }
}
