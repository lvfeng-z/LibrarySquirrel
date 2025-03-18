import SearchConditionQueryDTO from '../model/queryDTO/SearchConditionQueryDTO.js'
import Page from '../model/util/Page.js'
import BaseEntity from '../base/BaseEntity.js'
import SelectItem from '../model/util/SelectItem.js'
import { SearchTypes } from '../constant/SearchType.js'
import SearchDao from '../dao/SearchDao.js'
import { SearchCondition, SearchType } from '../model/util/SearchCondition.js'
import WorksDTO from '../model/dto/WorksDTO.js'
import WorksService from './WorksService.js'
import Works from '../model/entity/Works.js'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.js'
import { ArrayNotEmpty, IsNullish } from '../util/CommonUtil.js'
import LogUtil from '../util/LogUtil.js'
import { Operator } from '../constant/CrudConstant.js'
import LocalTagService from './LocalTagService.js'
import SiteTagService from './SiteTagService.js'
import LocalAuthorService from './LocalAuthorService.js'
import SiteAuthorService from './SiteAuthorService.js'
import WorksCommonQueryDTO from '../model/queryDTO/WorksCommonQueryDTO.js'
import DB from '../database/DB.js'

/**
 * 作品查询服务类
 */
export default class SearchService {
  /**
   * 封装数据库链接实例
   * @private
   */
  protected db: DB

  /**
   * Dao
   * @private
   */
  private dao: SearchDao

  /**
   * 是否为注入的链接实例
   * @private
   */
  protected readonly injectedDB: boolean

  constructor(db?: DB) {
    if (IsNullish(db)) {
      this.db = new DB(this.constructor.name)
      this.injectedDB = false
    } else {
      this.db = db
      this.injectedDB = true
    }
    this.dao = new SearchDao(this.db, this.injectedDB)
  }

  /**
   * 分页查询本地标签、站点标签、本地作者、站点作者
   * @param page
   */
  public async querySearchConditionPage(page: Page<SearchConditionQueryDTO, BaseEntity>): Promise<Page<SearchTypes, SelectItem>> {
    page = new Page(page)
    return this.dao.querySearchConditionPage(page)
  }

  /**
   * 分页查询作品
   * @param page
   */
  public async queryWorksPage(page: Page<SearchCondition[], WorksDTO>): Promise<Page<WorksQueryDTO, Works>> {
    const searchConditions = page.query
    page = new Page(page)
    page.query = searchConditions
    const worksPage = page.copy<WorksQueryDTO, WorksDTO>()
    const worksService = new WorksService()

    const worksQueryDTO = new WorksCommonQueryDTO()
    worksQueryDTO.includeLocalTagIds = []
    worksQueryDTO.excludeLocalTagIds = []
    worksQueryDTO.includeSiteTagIds = []
    worksQueryDTO.excludeSiteTagIds = []
    worksQueryDTO.includeLocalAuthorIds = []
    worksQueryDTO.excludeLocalAuthorIds = []
    worksQueryDTO.includeSiteAuthorIds = []
    worksQueryDTO.excludeSiteAuthorIds = []
    worksQueryDTO.operators = {}
    const usedLocalTag: number[] = []
    const usedSiteTag: number[] = []
    const usedLocalAuthor: number[] = []
    const usedSiteAuthor: number[] = []
    if (ArrayNotEmpty(searchConditions)) {
      for (const searchCondition of searchConditions) {
        switch (searchCondition.type) {
          case SearchType.LOCAL_TAG:
            if (searchCondition.operator === Operator.EQUAL) {
              worksQueryDTO.includeLocalTagIds.push(searchCondition.value as number)
            } else if (searchCondition.operator === Operator.NOT_EQUAL) {
              worksQueryDTO.excludeLocalTagIds.push(searchCondition.value as number)
            } else {
              LogUtil.warn('SearchService', `本地标签不支持这种匹配方式，operator: ${searchCondition.operator}`)
            }
            usedLocalTag.push(searchCondition.value as number)
            break
          case SearchType.SITE_TAG:
            if (searchCondition.operator === Operator.EQUAL) {
              worksQueryDTO.includeSiteTagIds.push(searchCondition.value as number)
            } else if (searchCondition.operator === Operator.NOT_EQUAL) {
              worksQueryDTO.excludeSiteTagIds.push(searchCondition.value as number)
            } else {
              LogUtil.warn('SearchService', `站点标签不支持这种匹配方式，operator: ${searchCondition.operator}`)
            }
            usedSiteTag.push(searchCondition.value as number)
            break
          case SearchType.LOCAL_AUTHOR:
            if (searchCondition.operator === Operator.EQUAL) {
              worksQueryDTO.includeLocalAuthorIds.push(searchCondition.value as number)
            } else if (searchCondition.operator === Operator.NOT_EQUAL) {
              worksQueryDTO.excludeLocalAuthorIds.push(searchCondition.value as number)
            } else {
              LogUtil.warn('SearchService', `本地作者不支持这种匹配方式，operator: ${searchCondition.operator}`)
            }
            usedLocalAuthor.push(searchCondition.value as number)
            break
          case SearchType.SITE_AUTHOR:
            if (searchCondition.operator === Operator.EQUAL) {
              worksQueryDTO.includeSiteAuthorIds.push(searchCondition.value as number)
            } else if (searchCondition.operator === Operator.NOT_EQUAL) {
              worksQueryDTO.excludeSiteAuthorIds.push(searchCondition.value as number)
            } else {
              LogUtil.warn('SearchService', `站点作者不支持这种匹配方式，operator: ${searchCondition.operator}`)
            }
            usedSiteAuthor.push(searchCondition.value as number)
            break
          case SearchType.WORKS_SITE_NAME:
            if (searchCondition.operator === Operator.EQUAL) {
              worksQueryDTO.siteWorksName = searchCondition.value as string
            } else if (searchCondition.operator === Operator.LIKE) {
              worksQueryDTO.siteWorksName = searchCondition.value as string
              worksQueryDTO.operators['siteWorksName'] = Operator.LIKE
            } else {
              LogUtil.warn('SearchService', `站点作品名称不支持这种匹配方式，operator: ${searchCondition.operator}`)
            }
            break
          // TODO 其他查询参数类型
          default:
            LogUtil.error('SearchService', `不支持查询参数类型${searchCondition.type}`)
        }
      }
    }
    worksPage.query = worksQueryDTO
    return worksService.queryPage(worksPage).then((result) => {
      const used: Map<SearchType, number[]> = new Map<SearchType, number[]>()
      used.set(SearchType.LOCAL_TAG, usedLocalTag)
      used.set(SearchType.SITE_TAG, usedSiteTag)
      used.set(SearchType.LOCAL_AUTHOR, usedLocalAuthor)
      used.set(SearchType.SITE_AUTHOR, usedSiteAuthor)
      this.updateLastUsed(used)
      return result
    })
  }

  /**
   * 更新查询参数最后一次使用的时间
   * @param used 以查询参数类型为键，待更新查询参数id列表为值的map
   */
  public async updateLastUsed(used: Map<SearchType, number[]>) {
    const usedLocalTag = used.get(SearchType.LOCAL_TAG)
    const process: Promise<number>[] = []
    if (ArrayNotEmpty(usedLocalTag)) {
      const localTagService = new LocalTagService()
      process.push(localTagService.updateLastUse(usedLocalTag))
    }
    const usedSiteTag = used.get(SearchType.SITE_TAG)
    if (ArrayNotEmpty(usedSiteTag)) {
      const siteTagService = new SiteTagService()
      process.push(siteTagService.updateLastUse(usedSiteTag))
    }
    const usedLocalAuthor = used.get(SearchType.LOCAL_AUTHOR)
    if (ArrayNotEmpty(usedLocalAuthor)) {
      const localAuthorService = new LocalAuthorService()
      process.push(localAuthorService.updateLastUse(usedLocalAuthor))
    }
    const usedSiteAuthor = used.get(SearchType.SITE_AUTHOR)
    if (ArrayNotEmpty(usedSiteAuthor)) {
      const siteAuthorService = new SiteAuthorService()
      process.push(siteAuthorService.updateLastUse(usedSiteAuthor))
    }
    return Promise.allSettled(process)
  }
}
