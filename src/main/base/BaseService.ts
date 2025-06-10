import BaseQueryDTO from './BaseQueryDTO.ts'
import BaseEntity from './BaseEntity.ts'
import Page from '../model/util/Page.ts'
import BaseDao from './BaseDao.ts'
import DB from '../database/DB.ts'
import { IsNullish } from '../util/CommonUtil.ts'
import { AssertFalse, AssertNotNullish } from '../util/AssertUtil.js'
import SelectItem from '../model/util/SelectItem.js'

/**
 * 基础Service类
 */
export default abstract class BaseService<Query extends BaseQueryDTO, Model extends BaseEntity, Dao extends BaseDao<Query, Model>> {
  /**
   * dao
   */
  protected dao: Dao

  /**
   * 封装数据库链接实例
   * @private
   */
  protected db: DB

  /**
   * 是否为注入的链接实例
   * @private
   */
  protected readonly injectedDB: boolean

  protected constructor(dao: new (db: DB, injectedDB: boolean) => Dao, db?: DB) {
    if (IsNullish(db)) {
      this.db = new DB(this.constructor.name)
      this.injectedDB = false
    } else {
      this.db = db
      this.injectedDB = true
    }
    this.dao = new dao(this.db, this.injectedDB)
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
   * 删除
   * @param query
   */
  public async delete(query: Query): Promise<number> {
    return this.dao.delete(query)
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
    AssertNotNullish(updateData.id, this.constructor.name, '更新数据失败，id不能为空')
    return this.dao.updateById(updateData)
  }

  /**
   * 批量更新
   * @param entities
   */
  public async updateBatchById(entities: Model[]) {
    const check = entities.some((entity) => IsNullish(entity.id))
    AssertFalse(check, this.constructor.name, '批量更新数据失败，id不能为空')
    return this.dao.updateBatchById(entities)
  }

  /**
   * 批量新增或更新
   * @param entities
   * @param conflicts
   */
  public async saveOrUpdateBatchById(entities: Model[], conflicts?: string[][]): Promise<number> {
    return this.dao.saveOrUpdateBatchById(entities, conflicts)
  }

  /**
   * 主键查询
   * @param id
   */
  public async getById(id: number | string): Promise<Model | undefined> {
    return this.dao.getById(id)
  }

  /**
   * 查询
   * @param query
   */
  public async get(query: Query): Promise<Model | undefined> {
    return this.dao.get(query)
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
