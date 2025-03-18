import BaseService from '../base/BaseService.js'
import ResourceQueryDTO from '../model/queryDTO/ResourceQueryDTO.js'
import Resource from '../model/entity/Resource.js'
import ResourceDao from '../dao/ResourceDao.js'
import DB from '../database/DB.js'
import { AssertNotNullish } from '../util/AssertUtil.js'
import { OnOff } from '../constant/OnOff.js'
import { ArrayNotEmpty, IsNullish } from '../util/CommonUtil.js'

/**
 * 资源服务
 */
export default class ResourceService extends BaseService<ResourceQueryDTO, Resource, ResourceDao> {
  constructor(db?: DB) {
    super(ResourceDao, db)
  }

  /**
   * 新增启用的资源
   * @param resource
   */
  public async saveActive(resource: Resource): Promise<number> {
    AssertNotNullish(resource.worksId, `资源设置为启用失败，worksId不能为空`)
    resource.state = OnOff.ON
    const allRes = await this.listByWorksId(resource.worksId)
    if (ArrayNotEmpty(allRes)) {
      allRes.forEach((res) => (res.state = OnOff.OFF))
      allRes.push(resource)
      return this.saveOrUpdateBatchById(allRes)
    } else {
      return this.save(resource)
    }
  }

  /**
   * 资源设置为启用
   * @param id
   * @param worksId
   */
  public async setActive(id: number, worksId?: number): Promise<number> {
    let allRes: Resource[]
    if (IsNullish(worksId)) {
      const target = await this.getById(id)
      AssertNotNullish(target, `资源设置为启用失败，资源id: ${id}不可用`)
      AssertNotNullish(target.worksId, `资源设置为启用失败，worksId不能为空`)
      allRes = await this.listByWorksId(target.worksId)
    } else {
      allRes = await this.listByWorksId(worksId)
    }
    allRes.forEach((res) => {
      if (res.id === id) {
        res.state = OnOff.ON
      } else {
        res.state = OnOff.OFF
      }
    })
    return this.updateBatchById(allRes)
  }

  /**
   * 清除作品不活跃的资源
   * @param worksId
   */
  public clearInactiveByWorksId(worksId: number): Promise<number> {
    const query = new ResourceQueryDTO()
    query.worksId = worksId
    query.state = OnOff.OFF
    return this.delete(query)
  }

  /**
   * 根据作品id查询启用的资源
   * @param worksId
   */
  public getActiveByWorksId(worksId: number): Promise<Resource | undefined> {
    const query = new ResourceQueryDTO()
    query.worksId = worksId
    query.state = OnOff.ON
    return this.get(query)
  }

  /**
   * 根据作品id查询所有资源
   * @param worksId
   */
  public listByWorksId(worksId: number): Promise<Resource[]> {
    const query = new ResourceQueryDTO()
    query.worksId = worksId
    return this.list(query)
  }
}
