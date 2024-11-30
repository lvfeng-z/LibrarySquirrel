import BaseQueryDTO from '../model/queryDTO/BaseQueryDTO.ts'
import BaseModel from '../model/entity/BaseModel.ts'
import Page from '../model/util/Page.ts'
import BaseDao from '../dao/BaseDao.ts'
import DB from '../database/DB.ts'
import { isNullish } from '../util/CommonUtil.ts'
import { assertFalse, assertNotNullish } from '../util/AssertUtil.js'
import SelectItem from '../model/util/SelectItem.js'

/**
 * 基础Service类
 */
export default abstract class BaseService<Query extends BaseQueryDTO, Model extends BaseModel, Dao extends BaseDao<Query, Model>> {
  /**
   * 子类名称
   */
  protected className: string

  /**
   * 子类名称
   */
  protected dao: Dao

  /**
   * 封装数据库链接实例
   * @private
   */
  protected db: DB | undefined

  /**
   * 是否为注入的链接实例
   * @private
   */
  protected readonly injectedDB: boolean

  protected constructor(childClassName: string, dao: Dao, db?: DB) {
    this.className = childClassName
    this.dao = dao
    if (isNullish(db)) {
      this.db = undefined
      this.injectedDB = false
    } else {
      this.db = db
      this.injectedDB = true
    }
  }

  /**
   * 保存
   * @param entity
   */
  public async save(entity: Model): Promise<number> {
    return this.dao.save(entity)
  }

  /**
   * 批量保存
   * @param entities
   * @param ignore 是否使用ignore关键字
   */
  public async saveBatch(entities: Model[], ignore?: boolean): Promise<number> {
    return this.dao.saveBatch(entities, ignore)
  }

  /**
   * 删除
   * @param id
   */
  public async deleteById(id: number | string): Promise<number> {
    return this.dao.deleteById(id)
  }

  /**
   * 批量删除
   * @param ids id列表
   */
  public async deleteBatchById(ids: number[] | string[]): Promise<number> {
    return this.dao.deleteBatchById(ids)
  }

  /**
   * 更新
   * @param updateData
   */
  public async updateById(updateData: Model): Promise<number> {
    assertNotNullish(updateData.id, this.className, '更新数据时，id不能为空')
    return this.dao.updateById(updateData.id as number | string, updateData)
  }

  /**
   * 批量更新
   * @param entities
   */
  public async updateBatchById(entities: Model[]) {
    const check = entities.some((entity) => isNullish(entity.id))
    assertFalse(check, this.className, '批量更新数据时，id不能为空')
    return this.dao.updateBatchById(entities)
  }

  /**
   * 批量新增或更新
   * @param entities
   */
  public async saveOrUpdateBatchById(entities: Model[]): Promise<number> {
    return this.dao.saveOrUpdateBatchById(entities)
  }

  /**
   * 主键查询
   * @param id
   */
  public async getById(id: number | string): Promise<Model | undefined> {
    return this.dao.getById(id)
  }

  /**
   * 分页查询
   * @param page
   */
  public async queryPage(page: Page<Query, Model>): Promise<Page<Query, Model>> {
    return this.dao.queryPage(page)
  }

  /**
   * 查询列表
   * @param query
   */
  public async list(query: Query): Promise<Model[]> {
    return this.dao.list(query)
  }

  /**
   * 根据id列表查询
   * @param ids id列表
   */
  public async listByIds(ids: number[] | string[]): Promise<Model[]> {
    return this.dao.listByIds(ids)
  }

  /**
   * 分页查询SelectItem
   * @param page 分页查询参数
   * @param valueName 标签value的名称
   * @param labelName 标签label的名称
   * @param secondaryLabelName 标签第二标签的名称
   */
  public async querySelectItemPage(
    page: Page<Query, Model>,
    valueName: string,
    labelName: string,
    secondaryLabelName?: string
  ): Promise<Page<Query, SelectItem>> {
    return this.dao.querySelectItemPage(page, valueName, labelName, secondaryLabelName)
  }
}
