import BaseQueryDTO from '../model/queryDTO/BaseQueryDTO.ts'
import BaseModel from '../model/BaseModel.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import BaseDao from '../dao/BaseDao.ts'
import StringUtil from '../util/StringUtil.ts'
import LogUtil from '../util/LogUtil.ts'
import DB from '../database/DB.ts'

/**
 * 基础Service类
 */
export default abstract class BaseService<
  Query extends BaseQueryDTO,
  Model extends BaseModel,
  Dao extends BaseDao<Query, Model>
> {
  /**
   * 子类名称
   */
  protected childClassName: string

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
    this.childClassName = childClassName
    this.dao = dao
    if (db === undefined || db === null) {
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
  public async save(entity: Model): Promise<number | string> {
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
   * 更新
   * @param updateData
   */
  public async updateById(updateData: Model): Promise<number> {
    if (StringUtil.isBlank(updateData.id)) {
      const msg = '更新数据时，id不能为空'
      LogUtil.error(this.childClassName, msg)
      throw new Error(msg)
    }
    return this.dao.updateById(updateData.id as number | string, updateData)
  }

  /**
   * 批量更新
   * @param entities
   */
  public async updateBatchById(entities: Model[]) {
    const check = entities.filter((entity) => entity.id === undefined || entity.id === null)
    if (check !== undefined && check !== null && check.length > 0) {
      const msg = '批量更新数据时，id不能为空'
      LogUtil.error(this.childClassName, msg)
      throw new Error(msg)
    }
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
  public async getById(id: number | string): Promise<Model> {
    return this.dao.getById(id)
  }

  /**
   * 分页查询
   * @param page
   */
  public async selectPage(page: PageModel<Query, Model>): Promise<PageModel<Query, Model>> {
    return this.dao.selectPage(page)
  }

  /**
   * 查询列表
   * @param query
   */
  public async selectList(query: Query): Promise<Model[]> {
    return this.dao.selectList(query)
  }
}
