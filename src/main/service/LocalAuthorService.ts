import BaseService from './BaseService.ts'
import LocalAuthorQueryDTO from '../model/queryDTO/LocalAuthorQueryDTO.ts'
import LocalAuthor from '../model/entity/LocalAuthor.ts'
import LocalAuthorDao from '../dao/LocalAuthorDao.ts'
import SelectItem from '../model/util/SelectItem.ts'
import LogUtil from '../util/LogUtil.ts'
import { Operator } from '../constant/CrudConstant.ts'
import PageModel from '../model/util/PageModel.ts'
import DB from '../database/DB.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import ReWorksAuthor from '../model/entity/ReWorksAuthor.ts'
import { ReWorksAuthorTypeEnum } from '../constant/ReWorksAuthorTypeEnum.ts'
import ReWorksAuthorService from './ReWorksAuthorService.ts'
import LocalAuthorDTO from '../model/dto/LocalAuthorDTO.ts'
import { notNullish } from '../util/CommonUtil.ts'

/**
 * 本地作者Service
 */
export default class LocalAuthorService extends BaseService<LocalAuthorQueryDTO, LocalAuthor, LocalAuthorDao> {
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
  public async queryPage(page: PageModel<LocalAuthorQueryDTO, LocalAuthor>): Promise<PageModel<LocalAuthorQueryDTO, LocalAuthor>> {
    try {
      if (notNullish(page.query)) {
        page.query.operators = {
          ...{ localAuthorName: Operator.LIKE },
          ...page.query.operators
        }
      }
      return super.queryPage(page)
    } catch (error) {
      LogUtil.error('LocalAuthorService', error)
      throw error
    }
  }

  /**
   * 查询SelectItem列表
   */
  public listSelectItems(query: LocalAuthorQueryDTO): Promise<SelectItem[]> {
    try {
      query = new LocalAuthorQueryDTO(query)
      query.operators = { localAuthorName: Operator.LIKE }
      return this.dao.baseListSelectItems(query, 'id', 'localAuthorName')
    } catch (error) {
      LogUtil.error('LocalAuthorService', error)
      throw error
    }
  }

  /**
   * 分页查询SelectItem
   */
  public querySelectItemPage(page: PageModel<LocalAuthorQueryDTO, LocalAuthor>): Promise<PageModel<LocalAuthorQueryDTO, SelectItem>> {
    try {
      page = new PageModel(page)
      page.query = new LocalAuthorQueryDTO(page.query)
      page.query.operators = { localAuthorName: Operator.LIKE }
      return this.dao.querySelectItemPage(page, 'id', 'localAuthorName')
    } catch (error) {
      LogUtil.error('LocalAuthorService', error)
      throw error
    }
  }

  /**
   * 批量获取作品与作者的关联
   * @param worksIds
   */
  public async listReWorksAuthor(worksIds: number[]): Promise<Map<number, LocalAuthorDTO[]>> {
    return this.dao.listReWorksAuthor(worksIds)
  }

  /**
   * 查询作品的本地作者
   * @param worksId 作品id
   */
  async listByWorksId(worksId: number): Promise<LocalAuthorDTO[]> {
    return this.dao.listByWorksId(worksId)
  }
}
