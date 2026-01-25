import BaseService from '../base/BaseService.ts'
import LocalAuthorQueryDTO from '../model/queryDTO/LocalAuthorQueryDTO.ts'
import LocalAuthor from '../model/entity/LocalAuthor.ts'
import LocalAuthorDao from '../dao/LocalAuthorDao.ts'
import SelectItem from '../model/util/SelectItem.ts'
import LogUtil from '../util/LogUtil.ts'
import { Operator } from '../constant/CrudConstant.ts'
import Page from '../model/util/Page.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import RankedLocalAuthor from '../model/domain/RankedLocalAuthor.ts'
import { NotNullish } from '../util/CommonUtil.ts'
import RankedLocalAuthorWithWorkId from '../model/domain/RankedLocalAuthorWithWorkId.ts'

/**
 * 本地作者Service
 */
export default class LocalAuthorService extends BaseService<LocalAuthorQueryDTO, LocalAuthor, LocalAuthorDao> {
  constructor(db?: DatabaseClient) {
    super(LocalAuthorDao, db)
  }

  /**
   * 更新最后使用的时间
   * @param ids
   */
  public async updateLastUse(ids: number[]) {
    const entities = ids.map((id) => {
      const temp = new LocalAuthor()
      temp.id = id
      temp.lastUse = Date.now()
      return temp
    })
    return this.dao.updateBatchById(entities)
  }

  /**
   * 分页查询
   * @param page
   */
  public async queryPage(page: Page<LocalAuthorQueryDTO, LocalAuthor>): Promise<Page<LocalAuthorQueryDTO, LocalAuthor>> {
    try {
      if (NotNullish(page.query)) {
        page.query.operators = {
          ...{ authorName: Operator.LIKE },
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
      query.operators = { authorName: Operator.LIKE }
      return this.dao.baseListSelectItems(query, 'id', 'authorName')
    } catch (error) {
      LogUtil.error('LocalAuthorService', error)
      throw error
    }
  }

  /**
   * 分页查询SelectItem
   */
  public querySelectItemPage(page: Page<LocalAuthorQueryDTO, LocalAuthor>): Promise<Page<LocalAuthorQueryDTO, SelectItem>> {
    try {
      page = new Page(page)
      page.query = new LocalAuthorQueryDTO(page.query)
      page.query.operators = { authorName: Operator.LIKE }
      return this.dao.querySelectItemPage(page, 'id', 'authorName')
    } catch (error) {
      LogUtil.error('LocalAuthorService', error)
      throw error
    }
  }

  /**
   * 批量获取作品与作者的关联
   * @param workIds
   */
  public async listReWorkAuthor(workIds: number[]): Promise<Map<number, RankedLocalAuthor[]>> {
    return this.dao.listReWorkAuthor(workIds)
  }

  /**
   * 查询作品的本地作者
   * @param workId 作品id
   */
  public async listDTOByWorkId(workId: number): Promise<RankedLocalAuthor[]> {
    return this.dao.listDTOByWorkId(workId)
  }

  /**
   * 查询作品的本地作者列表
   * @param workIds 作品id列表
   */
  public async listRankedLocalAuthorWithWorkIdByWorkIds(workIds: number[]): Promise<RankedLocalAuthorWithWorkId[]> {
    return this.dao.listRankedLocalAuthorWithWorkIdByWorkIds(workIds)
  }
}
