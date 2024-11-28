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
import Site from '../model/entity/Site.js'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO.js'
import SiteTagService from './SiteTagService.js'
import LocalAuthorService from './LocalAuthorService.js'

/**
 * 查询服务类
 */
export default class QueryService {
  /**
   * 分页查询QueryCondition
   * @param page
   */
  public async queryQueryConditionPage(page: Page<QueryConditionQueryDTO, BaseModel>): Promise<Page<QueryTypes, ResultTypes>[]> {
    const result: Page<QueryTypes, ResultTypes>[] = []
    const queryProcesses: Promise<unknown>[] = []
    const query = page.query

    // 本地标签
    if (isNullish(query?.types) || query.types.includes(QueryType.LOCAL_TAG)) {
      const localTagPage = page.copy<LocalTagQueryDTO, LocalTag>()
      localTagPage.query = new LocalTagQueryDTO()
      localTagPage.query.localTagName = query?.keyword
      localTagPage.query.operators = { localTagName: Operator.LIKE }
      const localTagService = new LocalTagService()
      const localTagQuery = localTagService.queryPage(localTagPage).then((localTagResult) => result.push(localTagResult))
      queryProcesses.push(localTagQuery)
    }

    // 站点标签
    if (isNullish(query?.types) || query.types.includes(QueryType.SITE_TAG)) {
      const siteTagPage = page.copy<SiteTagQueryDTO, SiteTag>()
      siteTagPage.query = new LocalTagQueryDTO()
      siteTagPage.query.siteTagName = query?.keyword
      siteTagPage.query.operators = { siteTagName: Operator.LIKE }
      const siteTagService = new SiteTagService()
      const siteTagQuery = siteTagService.queryPage(siteTagPage).then((siteTagResult) => result.push(siteTagResult))
      queryProcesses.push(siteTagQuery)
    }

    // 本地作者
    if (isNullish(query?.types) || query.types.includes(QueryType.LOCAL_AUTHOR)) {
      const LocalAuthorPage = page.copy<LocalAuthorQueryDTO, LocalAuthor>()
      LocalAuthorPage.query = new LocalAuthorQueryDTO()
      LocalAuthorPage.query.localAuthorName = query?.keyword
      LocalAuthorPage.query.operators = { siteTagName: Operator.LIKE }
      const localAuthorService = new LocalAuthorService()
      const localAuthorQuery = localAuthorService
        .queryPage(LocalAuthorPage)
        .then((localAuthorResult) => result.push(localAuthorResult))
      queryProcesses.push(localAuthorQuery)
    }
    // TODO 剩下的几种

    await Promise.allSettled(queryProcesses)
    return result
  }
}

type QueryTypes = LocalTagQueryDTO | SiteTagQueryDTO | LocalAuthorQueryDTO | SiteAuthorQueryDTO | SiteQueryDTO
type ResultTypes = LocalTag | SiteTag | LocalAuthor | SiteAuthor | Site
