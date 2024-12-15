import SearchConditionQueryDTO from '../model/queryDTO/SearchConditionQueryDTO.js'
import Page from '../model/util/Page.js'
import BaseEntity from '../model/entity/BaseEntity.js'
import SelectItem from '../model/util/SelectItem.js'
import { SearchTypes } from '../constant/SearchType.js'
import SearchDao from '../dao/SearchDao.js'

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
}
