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
import { notNullish } from '../util/CommonUtil.ts'

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
      return reWorksAuthor
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
   * 分页查询
   * @param page
   */
  public async selectPage(
    page: PageModel<LocalAuthorQueryDTO, LocalAuthor>
  ): Promise<PageModel<LocalAuthorQueryDTO, LocalAuthor>> {
    try {
      if (notNullish(page.query)) {
        page.query.assignComparator = {
          ...{ localAuthorName: COMPARATOR.LIKE },
          ...page.query.assignComparator
        }
      }
      return super.selectPage(page)
    } catch (error) {
      LogUtil.error('LocalAuthorService', error)
      throw error
    }
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

  /**
   * 批量获取作品与作者的关联
   * @param worksIds
   */
  public async getWorksAuthorRelationShip(
    worksIds: number[]
  ): Promise<Map<number, LocalAuthorDTO[]>> {
    return this.dao.getWorksAuthorRelationShip(worksIds)
  }

  /**
   * 查询作品的本地作者
   * @param worksId 作品id
   */
  async listByWorksId(worksId: number): Promise<LocalAuthorDTO[]> {
    return this.dao.listByWorksId(worksId)
  }
}
