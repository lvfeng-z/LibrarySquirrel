import QueryConditionQueryDTO from '../model/queryDTO/QueryConditionQueryDTO.js'
import Page from '../model/util/Page.js'
import BaseModel from '../model/entity/BaseModel.js'
import { isNullish } from '../util/CommonUtil.js'
import { QueryType } from '../model/util/QueryCondition.js'
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
export default class QueryService {
  /**
   * 分页查询本地标签、站点标签、本地作者、站点作者
   * @param page
   */
  public async queryQueryConditionPage(page: Page<QueryConditionQueryDTO, BaseModel>): Promise<Page<QueryTypes, SelectItem>[]> {
    const result: Page<QueryTypes, SelectItem>[] = []
    const queryProcesses: Promise<unknown>[] = []
    const query = page.query

    // 本地标签
    if (isNullish(query?.types) || query.types.includes(QueryType.LOCAL_TAG)) {
      const localTagPage = page.copy<LocalTagQueryDTO, LocalTag>()
      localTagPage.query = new LocalTagQueryDTO()
      localTagPage.query.localTagName = query?.keyword
      localTagPage.query.operators = { localTagName: Operator.LIKE }
      const localTagService = new LocalTagService()
      const localTagQuery = localTagService.querySelectItemPage(localTagPage).then((localTagResult) => {
        result.push(localTagResult)
      })
      queryProcesses.push(localTagQuery)
    }

    // 站点标签
    if (isNullish(query?.types) || query.types.includes(QueryType.SITE_TAG)) {
      const siteTagPage = page.copy<SiteTagQueryDTO, SiteTag>()
      siteTagPage.query = new LocalTagQueryDTO()
      siteTagPage.query.siteTagName = query?.keyword
      siteTagPage.query.operators = { siteTagName: Operator.LIKE }
      const siteTagService = new SiteTagService()
      const siteTagQuery = siteTagService
        .querySelectItemPage(siteTagPage, 'id', 'siteTagName')
        .then((siteTagResult) => result.push(siteTagResult))
      queryProcesses.push(siteTagQuery)
    }

    // 本地作者
    if (isNullish(query?.types) || query.types.includes(QueryType.LOCAL_AUTHOR)) {
      const localAuthorPage = page.copy<LocalAuthorQueryDTO, LocalAuthor>()
      localAuthorPage.query = new LocalAuthorQueryDTO()
      localAuthorPage.query.localAuthorName = query?.keyword
      localAuthorPage.query.operators = { siteTagName: Operator.LIKE }
      const localAuthorService = new LocalAuthorService()
      const localAuthorQuery = localAuthorService
        .querySelectItemPage(localAuthorPage)
        .then((localAuthorResult) => result.push(localAuthorResult))
      queryProcesses.push(localAuthorQuery)
    }

    // 站点作者
    if (isNullish(query?.types) || query.types.includes(QueryType.SITE_AUTHOR)) {
      const siteAuthorPage = page.copy<SiteAuthorQueryDTO, SiteAuthor>()
      siteAuthorPage.query = new SiteAuthorQueryDTO()
      siteAuthorPage.query.siteAuthorName = query?.keyword
      siteAuthorPage.query.operators = { siteTagName: Operator.LIKE }
      const siteAuthorService = new SiteAuthorService()
      const siteAuthorQuery = siteAuthorService
        .querySelectItemPage(siteAuthorPage, 'id', 'siteTagName')
        .then((siteAuthorResult) => result.push(siteAuthorResult))
      queryProcesses.push(siteAuthorQuery)
    }

    await Promise.allSettled(queryProcesses)
    return result
  }
}

type QueryTypes = LocalTagQueryDTO | SiteTagQueryDTO | LocalAuthorQueryDTO | SiteAuthorQueryDTO | SiteQueryDTO
