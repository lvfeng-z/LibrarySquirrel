import SearchConditionQueryDTO from '@shared/model/queryDTO/SearchConditionQueryDTO.js'
import Page from '@shared/model/util/Page.js'
import BaseEntity from '@shared/model/base/BaseEntity.ts'
import SelectItem from '@shared/model/util/SelectItem.js'
import { SearchTypes } from '../constant/SearchType.js'
import SearchDao from '../dao/SearchDao.js'
import { SearchCondition, SearchType } from '@shared/model/util/SearchCondition.js'
import WorkFullDTO from '@shared/model/dto/WorkFullDTO.ts'
import WorkQueryDTO from '@shared/model/queryDTO/WorkQueryDTO.ts'
import { arrayNotEmpty, isNullish } from '@shared/util/CommonUtil.ts'
import LocalTagService from './LocalTagService.js'
import SiteTagService from './SiteTagService.js'
import LocalAuthorService from './LocalAuthorService.js'
import SiteAuthorService from './SiteAuthorService.js'
import DatabaseClient from '../database/DatabaseClient.js'
import { WorkDao } from '../dao/WorkDao.ts'
import WorkSetService from './WorkSetService.ts'
import WorkSetCoverDTO from '@shared/model/dto/WorkSetCoverDTO.ts'
import WorkSetQueryDTO from '@shared/model/queryDTO/WorkSetQueryDTO.ts'

/**
 * 作品查询服务类
 */
export default class SearchService {
  /**
   * 数据库客户端
   * @private
   */
  protected db: DatabaseClient

  /**
   * Dao
   * @private
   */
  private dao: SearchDao

  /**
   * 是否为注入的数据库客户端
   * @private
   */
  protected readonly injectedDB: boolean

  constructor(db?: DatabaseClient) {
    if (isNullish(db)) {
      this.db = new DatabaseClient(this.constructor.name)
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
   * @param page 分页查询参数，query 为 SearchCondition[] 数组
   */
  public async queryWorkPage(page: Page<SearchCondition[], WorkFullDTO>): Promise<Page<WorkQueryDTO, WorkFullDTO>> {
    const searchConditions = page.query ?? []
    // 创建 WorkQueryDTO 用于分页
    const workPage = new Page<WorkQueryDTO, WorkFullDTO>(page as unknown as Page<WorkQueryDTO, WorkFullDTO>)
    const workDao = new WorkDao(this.db, this.injectedDB)

    // 记录使用的搜索条件用于更新最后使用时间
    const usedLocalTag: number[] = []
    const usedSiteTag: number[] = []
    const usedLocalAuthor: number[] = []
    const usedSiteAuthor: number[] = []

    if (arrayNotEmpty(searchConditions)) {
      for (const searchCondition of searchConditions) {
        switch (searchCondition.type) {
          case SearchType.LOCAL_TAG:
            usedLocalTag.push(searchCondition.value as number)
            break
          case SearchType.SITE_TAG:
            usedSiteTag.push(searchCondition.value as number)
            break
          case SearchType.LOCAL_AUTHOR:
            usedLocalAuthor.push(searchCondition.value as number)
            break
          case SearchType.SITE_AUTHOR:
            usedSiteAuthor.push(searchCondition.value as number)
            break
          default:
            // 其他类型在 WorkDao 中处理
            break
        }
      }
    }

    return workDao.queryPageByWorkConditions(workPage, searchConditions).then((result) => {
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
    if (arrayNotEmpty(usedLocalTag)) {
      const localTagService = new LocalTagService()
      process.push(localTagService.updateLastUse(usedLocalTag))
    }
    const usedSiteTag = used.get(SearchType.SITE_TAG)
    if (arrayNotEmpty(usedSiteTag)) {
      const siteTagService = new SiteTagService()
      process.push(siteTagService.updateLastUse(usedSiteTag))
    }
    const usedLocalAuthor = used.get(SearchType.LOCAL_AUTHOR)
    if (arrayNotEmpty(usedLocalAuthor)) {
      const localAuthorService = new LocalAuthorService()
      process.push(localAuthorService.updateLastUse(usedLocalAuthor))
    }
    const usedSiteAuthor = used.get(SearchType.SITE_AUTHOR)
    if (arrayNotEmpty(usedSiteAuthor)) {
      const siteAuthorService = new SiteAuthorService()
      process.push(siteAuthorService.updateLastUse(usedSiteAuthor))
    }
    return Promise.allSettled(process)
  }

  /**
   * 分页查询作品集（根据作品搜索条件）
   * 当作品集中的任意作品符合条件时，将这个作品集放入结果集中
   * @param page 分页查询参数，query 为 SearchCondition[] 数组
   */
  public async queryWorkSetPage(page: Page<SearchCondition[], WorkSetCoverDTO>): Promise<Page<SearchCondition[], WorkSetCoverDTO>> {
    const searchConditions = page.query ?? []

    // 记录使用的搜索条件用于更新最后使用时间
    const usedLocalTag: number[] = []
    const usedSiteTag: number[] = []
    const usedLocalAuthor: number[] = []
    const usedSiteAuthor: number[] = []

    if (arrayNotEmpty(searchConditions)) {
      for (const searchCondition of searchConditions) {
        switch (searchCondition.type) {
          case SearchType.LOCAL_TAG:
            usedLocalTag.push(searchCondition.value as number)
            break
          case SearchType.SITE_TAG:
            usedSiteTag.push(searchCondition.value as number)
            break
          case SearchType.LOCAL_AUTHOR:
            usedLocalAuthor.push(searchCondition.value as number)
            break
          case SearchType.SITE_AUTHOR:
            usedSiteAuthor.push(searchCondition.value as number)
            break
          default:
            // 其他类型不需要更新最后使用时间
            break
        }
      }
    }

    const workSetService = new WorkSetService()
    // 创建 WorkSetQueryDTO 用于分页
    const workSetPage = new Page<WorkSetQueryDTO, WorkSetCoverDTO>(page as unknown as Page<WorkSetQueryDTO, WorkSetCoverDTO>)
    return workSetService.queryPageByWorkConditionsWithCover(workSetPage, searchConditions).then((result) => {
      const used: Map<SearchType, number[]> = new Map<SearchType, number[]>()
      used.set(SearchType.LOCAL_TAG, usedLocalTag)
      used.set(SearchType.SITE_TAG, usedSiteTag)
      used.set(SearchType.LOCAL_AUTHOR, usedLocalAuthor)
      used.set(SearchType.SITE_AUTHOR, usedSiteAuthor)
      this.updateLastUsed(used)
      return result
    }) as unknown as Promise<Page<SearchCondition[], WorkSetCoverDTO>>
  }
}
