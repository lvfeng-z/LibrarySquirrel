import BaseService from './BaseService.ts'
import LocalAuthorQueryDTO from '../model/queryDTO/LocalAuthorQueryDTO.ts'
import LocalAuthor from '../model/LocalAuthor.ts'
import BaseDao from '../dao/BaseDao.ts'
import LocalAuthorDao from '../dao/LocalAuthorDao.ts'
import SelectItem from '../model/utilModels/SelectItem.ts'
import LogUtil from '../util/LogUtil.ts'
import { COMPARATOR } from '../constant/CrudConstant.ts'
import PageModel from '../model/utilModels/PageModel.ts'

/**
 * 本地作者Service
 */
export default class LocalAuthorService extends BaseService<LocalAuthorQueryDTO, LocalAuthor> {
  constructor() {
    super('LocalAuthorService')
  }

  /**
   * 查询SelectItem列表
   */
  public getSelectItems(query: LocalAuthorQueryDTO): Promise<SelectItem[]> {
    const dao = new LocalAuthorDao()
    try {
      query = new LocalAuthorQueryDTO(query)
      query.assignComparator = { localAuthorName: COMPARATOR.LIKE }
      return dao.getSelectItems(query, 'id', 'localAuthorName')
    } catch (error) {
      LogUtil.error('LocalAuthorService', error)
      throw error
    }
  }

  /**
   * 分页查询SelectItem
   */
  public getSelectItemPage(
    page: PageModel<LocalAuthorQueryDTO, LocalAuthor>
  ): Promise<PageModel<LocalAuthorQueryDTO, SelectItem>> {
    const dao = new LocalAuthorDao()
    try {
      page = new PageModel(page)
      if (page.query === undefined) {
        page.query = new LocalAuthorQueryDTO()
      }
      page.query.assignComparator = { localAuthorName: COMPARATOR.LIKE }
      return dao.getSelectItemPage(page, 'id', 'localAuthorName')
    } catch (error) {
      LogUtil.error('LocalAuthorService', error)
      throw error
    }
  }

  protected getDao(): BaseDao<LocalAuthorQueryDTO, LocalAuthor> {
    return new LocalAuthorDao()
  }
}
