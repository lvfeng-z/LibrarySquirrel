import SearchConditionQueryDTO from '../model/queryDTO/SearchConditionQueryDTO.js'
import Page from '../model/util/Page.js'
import BaseEntity from '../model/entity/BaseEntity.js'
import { isNullish } from '../util/CommonUtil.js'
import { SearchType } from '../model/util/SearchCondition.js'
import LocalTag from '../model/entity/LocalTag.js'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO.js'
import { Operator } from '../constant/CrudConstant.js'
import LocalTagService from './LocalTagService.js'
import SiteTag from '../model/entity/SiteTag.js'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO.js'
import LocalAuthorQueryDTO from '../model/queryDTO/LocalAuthorQueryDTO.js'
import SiteAuthorQueryDTO from '../model/queryDTO/SiteAuthorQueryDTO.js'
import SiteAuthor from '../model/entity/SiteAuthor.js'
import LocalAuthor from '../model/entity/LocalAuthor.js'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO.js'
import SiteTagService from './SiteTagService.js'
import LocalAuthorService from './LocalAuthorService.js'
import SiteAuthorService from './SiteAuthorService.js'
import SelectItem from '../model/util/SelectItem.js'

/**
 * 查询服务类
 */
export default class SearchService {
  /**
   * 分页查询本地标签、站点标签、本地作者、站点作者
   * @param page
   */
  public async querySearchConditionPage(
    page: Page<SearchConditionQueryDTO, BaseEntity>
  ): Promise<Map<SearchType, Page<SearchTypes, SelectItem>>> {
    const result: Map<SearchType, Page<SearchTypes, SelectItem>> = new Map()
    const queryProcesses: Promise<unknown>[] = []
    const innerPage = new Page(page)
    const query = page.query

    // 本地标签
    if (isNullish(query?.types) || query.types.includes(SearchType.LOCAL_TAG)) {
      const localTagPage = innerPage.copy<LocalTagQueryDTO, LocalTag>()
      localTagPage.query = new LocalTagQueryDTO()
      localTagPage.query.localTagName = query?.keyword
      localTagPage.query.operators = { localTagName: Operator.LIKE }
      const localTagService = new LocalTagService()
      const localTagQuery = localTagService.querySelectItemPage(localTagPage).then((localTagResult) => {
        result.set(SearchType.LOCAL_TAG, localTagResult)
      })
      queryProcesses.push(localTagQuery)
    }

    // 站点标签
    if (isNullish(query?.types) || query.types.includes(SearchType.SITE_TAG)) {
      const siteTagPage = innerPage.copy<SiteTagQueryDTO, SiteTag>()
      siteTagPage.query = new SiteTagQueryDTO()
      siteTagPage.query.siteTagName = query?.keyword
      siteTagPage.query.operators = { siteTagName: Operator.LIKE }
      const siteTagService = new SiteTagService()
      const siteTagQuery = siteTagService
        .querySelectItemPage(siteTagPage)
        .then((siteTagResult) => result.set(SearchType.SITE_TAG, siteTagResult))
      queryProcesses.push(siteTagQuery)
    }

    // 本地作者
    if (isNullish(query?.types) || query.types.includes(SearchType.LOCAL_AUTHOR)) {
      const localAuthorPage = innerPage.copy<LocalAuthorQueryDTO, LocalAuthor>()
      localAuthorPage.query = new LocalAuthorQueryDTO()
      localAuthorPage.query.localAuthorName = query?.keyword
      localAuthorPage.query.operators = { siteTagName: Operator.LIKE }
      const localAuthorService = new LocalAuthorService()
      const localAuthorQuery = localAuthorService
        .querySelectItemPage(localAuthorPage)
        .then((localAuthorResult) => result.set(SearchType.LOCAL_AUTHOR, localAuthorResult))
      queryProcesses.push(localAuthorQuery)
    }

    // 站点作者
    if (isNullish(query?.types) || query.types.includes(SearchType.SITE_AUTHOR)) {
      const siteAuthorPage = innerPage.copy<SiteAuthorQueryDTO, SiteAuthor>()
      siteAuthorPage.query = new SiteAuthorQueryDTO()
      siteAuthorPage.query.siteAuthorName = query?.keyword
      siteAuthorPage.query.operators = { siteTagName: Operator.LIKE }
      const siteAuthorService = new SiteAuthorService()
      const siteAuthorQuery = siteAuthorService
        .querySelectItemPage(siteAuthorPage)
        .then((siteAuthorResult) => result.set(SearchType.SITE_AUTHOR, siteAuthorResult))
      queryProcesses.push(siteAuthorQuery)
    }

    await Promise.all(queryProcesses)
    return result
  }
}

type SearchTypes = LocalTagQueryDTO | SiteTagQueryDTO | LocalAuthorQueryDTO | SiteAuthorQueryDTO | SiteQueryDTO
