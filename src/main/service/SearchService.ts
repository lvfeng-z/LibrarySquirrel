import SearchConditionQueryDTO from '../model/queryDTO/SearchConditionQueryDTO.js'
import Page from '../model/util/Page.js'
import BaseEntity from '../model/entity/BaseEntity.js'
import SelectItem from '../model/util/SelectItem.js'
import { SearchTypes } from '../constant/SearchType.js'
import SearchDao from '../dao/SearchDao.js'
import { SearchCondition, SearchType } from '../model/util/SearchCondition.js'
import WorksDTO from '../model/dto/WorksDTO.js'
import WorksService from './WorksService.js'
import Works from '../model/entity/Works.js'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.js'
import { arrayNotEmpty } from '../util/CommonUtil.js'
import LogUtil from '../util/LogUtil.js'
import { Operator } from '../constant/CrudConstant.js'

/**
 * 查询服务类
 */
export default class SearchService {
  dao: SearchDao

  constructor() {
    this.dao = new SearchDao()
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
    const tempQuery = page.query
    page = new Page(page)
    page.query = tempQuery
    const worksService = new WorksService()
    const tempPage = page.copy<WorksQueryDTO, WorksDTO>()

    // TODO 配置查询参数
    const modifiedQuery = new WorksQueryDTO()
    const searchConditions = page.query
    if (arrayNotEmpty(searchConditions)) {
      for (const searchCondition of searchConditions) {
        switch (searchCondition.type) {
          case SearchType.LOCAL_TAG:
            if (searchCondition.operator === Operator.EQUAL) {
              modifiedQuery.includeLocalTagIds.push(searchCondition.value as number)
            } else if (searchCondition.operator === Operator.NOT_EQUAL) {
              modifiedQuery.excludeLocalTagIds.push(searchCondition.value as number)
            }
            break
          case SearchType.SITE_TAG:
            if (searchCondition.operator === Operator.EQUAL) {
              modifiedQuery.includeSiteTagIds.push(searchCondition.value as number)
            } else if (searchCondition.operator === Operator.NOT_EQUAL) {
              modifiedQuery.includeSiteTagIds.push(searchCondition.value as number)
            }
            break
          case SearchType.LOCAL_AUTHOR:
            if (searchCondition.operator === Operator.EQUAL) {
              modifiedQuery.includeLocalAuthorIds.push(searchCondition.value as number)
            } else if (searchCondition.operator === Operator.NOT_EQUAL) {
              modifiedQuery.includeLocalAuthorIds.push(searchCondition.value as number)
            }
            break
          case SearchType.SITE_AUTHOR:
            if (searchCondition.operator === Operator.EQUAL) {
              modifiedQuery.includeSiteAuthorIds.push(searchCondition.value as number)
            } else if (searchCondition.operator === Operator.NOT_EQUAL) {
              modifiedQuery.includeSiteAuthorIds.push(searchCondition.value as number)
            }
            break
          default:
            LogUtil.error('SearchService', `未知的查询参数类型${searchCondition.type}`)
        }
      }
    }
    tempPage.query = modifiedQuery
    return worksService.queryPage(tempPage)
  }
}
