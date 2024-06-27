import BaseQueryDTO from '../model/queryDTO/BaseQueryDTO.ts'
import BaseModel from '../model/BaseModel.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import BaseDao from '../dao/BaseDao.ts'
import StringUtil from '../util/StringUtil.ts'
import LogUtil from '../util/LogUtil.ts'

/**
 * 基础Service类
 */
export default abstract class BaseService<Query extends BaseQueryDTO, Model extends BaseModel> {
  /**
   * 子类名称
   */
  protected childClassName: string

  /**
   * 子类名称
   */
  private dao: BaseDao<Query, Model>

  protected constructor(childClassName: string, dao: BaseDao<Query, Model>) {
    this.childClassName = childClassName
    this.dao = dao
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
   */
  public async saveBatch(entities: Model[]): Promise<number> {
    return this.dao.saveBatch(entities)
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
