import BaseService from './BaseService.ts'
import LocalAuthorQueryDTO from '../model/queryDTO/LocalAuthorQueryDTO.ts'
import LocalAuthor from '../model/LocalAuthor.ts'
import LocalAuthorDao from '../dao/LocalAuthorDao.ts'
import SelectItem from '../model/utilModels/SelectItem.ts'
import LogUtil from '../util/LogUtil.ts'
import { COMPARATOR } from '../constant/CrudConstant.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import DB from '../database/DB.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import ReWorksAuthor from '../model/ReWorksAuthor.ts'
import { ReWorksAuthorTypeEnum } from '../constant/ReWorksAuthorTypeEnum.ts'
import ReWorksAuthorService from './ReWorksAuthorService.ts'
import LocalAuthorDTO from '../model/dto/LocalAuthorDTO.ts'

/**
 * 本地作者Service
 */
export default class LocalAuthorService extends BaseService<
  LocalAuthorQueryDTO,
  LocalAuthor,
  LocalAuthorDao
> {
  constructor(db?: DB) {
    super('LocalAuthorService', new LocalAuthorDao(db), db)
  }

  /**
   * 关联本地作者和作品
   * @param localAuthorDTOs 作者信息
   * @param worksDTO 作品信息
   */
  async link(localAuthorDTOs: LocalAuthorDTO[], worksDTO: WorksDTO) {
    const reWorksAuthors = localAuthorDTOs.map((localAuthorDTO) => {
      const reWorksAuthor = new ReWorksAuthor()
      reWorksAuthor.worksId = worksDTO.id as number
      reWorksAuthor.authorRole = localAuthorDTO.authorRole
      reWorksAuthor.localAuthorId = localAuthorDTO.id as number
      reWorksAuthor.type = ReWorksAuthorTypeEnum.LOCAL
      return reWorksAuthors
    })

    // 调用ReWorksAuthorService前区分是否为注入式DB
    let reWorksAuthorService: ReWorksAuthorService
    if (this.injectedDB) {
      reWorksAuthorService = new ReWorksAuthorService(this.db)
    } else {
      reWorksAuthorService = new ReWorksAuthorService()
    }

    return reWorksAuthorService.saveBatch(reWorksAuthors, true)
  }

  /**
   * 查询SelectItem列表
   */
  public getSelectItems(query: LocalAuthorQueryDTO): Promise<SelectItem[]> {
    try {
      query = new LocalAuthorQueryDTO(query)
      query.assignComparator = { localAuthorName: COMPARATOR.LIKE }
      return this.dao.getSelectItems(query, 'id', 'localAuthorName')
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
    try {
      page = new PageModel(page)
      page.query = new LocalAuthorQueryDTO(page.query)
      page.query.assignComparator = { localAuthorName: COMPARATOR.LIKE }
      return this.dao.getSelectItemPage(page, 'id', 'localAuthorName')
    } catch (error) {
      LogUtil.error('LocalAuthorService', error)
      throw error
    }
  }
}
