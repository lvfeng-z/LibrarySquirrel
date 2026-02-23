import BaseService from '../base/BaseService.ts'
import ReWorkWorkSetQueryDTO from '@shared/model/queryDTO/ReWorkWorkSetQueryDTO.ts'
import ReWorkWorkSet from '@shared/model/entity/ReWorkWorkSet.ts'
import ReWorkWorkSetDao from '../dao/ReWorkWorkSetDao.ts'
import { WorkDao } from '../dao/WorkDao.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish } from '@shared/util/CommonUtil.ts'
import LogUtil from '../util/LogUtil.js'
import Work from '@shared/model/entity/Work.ts'

export default class ReWorkWorkSetService extends BaseService<ReWorkWorkSetQueryDTO, ReWorkWorkSet, ReWorkWorkSetDao> {
  constructor(db?: DatabaseClient) {
    super(ReWorkWorkSetDao, db)
  }

  /**
   * 批量关联作品到作品集
   * @param workIds 作品id列表
   * @param workSetId 作品集id
   * @throws {string} 当作品已存在于作品集中时抛出错误信息
   */
  public async linkBatchToWorkSet(workIds: number[], workSetId: number): Promise<number> {
    if (workIds.length === 0) {
      return 0
    }

    // 检查哪些作品已存在于作品集中
    const existingLinks = await this.listByWorkSetId(workSetId)
    const existingWorkIds = new Set(existingLinks.map((link) => link.workId))
    const duplicateWorkIds = workIds.filter((id) => existingWorkIds.has(id))

    if (duplicateWorkIds.length > 0) {
      const workDao = new WorkDao(this.db, false)
      const works = await workDao.listByIds(duplicateWorkIds)
      const workNames = works.map((w) => w.siteWorkName || w.siteWorkId).join(', ')
      throw new Error(`以下作品已存在于作品集中: ${workNames}`)
    }

    // 获取作品信息
    const workDao = new WorkDao(this.db, false)
    const works = await workDao.listByIds(workIds)

    // 关联作品集和作品
    return this.link(works, workSetId)
  }

  /**
   * 根据作品集ID查询所有关联
   * @param workSetId 作品集ID
   */
  private async listByWorkSetId(workSetId: number): Promise<ReWorkWorkSet[]> {
    const query = new ReWorkWorkSetQueryDTO()
    query.workSetId = workSetId
    return this.list(query)
  }

  /**
   * 关联作品集和作品
   * @param work
   * @param workSetId
   */
  public async link(work: Work[], workSetId: number): Promise<number> {
    // 校验
    const legalWorkList = work.filter((tempWork) => {
      if (IsNullish(tempWork)) {
        LogUtil.warn(this.constructor.name, `关联作品集和作品失败，作品信息不能为空`)
        return false
      }
      if (IsNullish(!Object.hasOwn(tempWork, 'id') || tempWork.id)) {
        const siteWorkName = Object.hasOwn(tempWork, 'siteWorkName') ? tempWork.siteWorkName : 'unknown'
        LogUtil.warn(this.constructor.name, `关联作品集和作品失败，作品id不能为空，siteWorkName: ${siteWorkName}`)
        return false
      }
      return true
    })

    if (legalWorkList.length === 0) {
      return 0
    }

    // 获取当前作品集中最大的排序值
    const existingLinks = await this.listByWorkSetId(workSetId)
    let maxSortOrder = 0
    for (const link of existingLinks) {
      if (link.sortOrder !== null && link.sortOrder !== undefined && link.sortOrder > maxSortOrder) {
        maxSortOrder = link.sortOrder
      }
    }

    // 创建关联对象，设置排序值
    const links = legalWorkList.map((workDTO, index) => {
      const reWorkWorkSet = new ReWorkWorkSet()
      reWorkWorkSet.workId = workDTO.id
      reWorkWorkSet.workSetId = workSetId
      reWorkWorkSet.sortOrder = maxSortOrder + index + 1
      return reWorkWorkSet
    })

    return this.saveBatch(links, true)
  }

  /**
   * 关联作品和标签
   * @param workId
   * @param workSetIds
   */
  public async linkByWork(workId: number, workSetIds: number[]): Promise<number> {
    if (ArrayIsEmpty(workSetIds)) {
      return 0
    }

    // 创建关联对象
    const links = workSetIds.map((workSetId) => {
      const reWorkWorkSet = new ReWorkWorkSet()
      reWorkWorkSet.workId = workId
      reWorkWorkSet.workSetId = workSetId
      return reWorkWorkSet
    })

    return super.saveBatch(links, true)
  }

  /**
   * 更新作品和标签的关联（全量更新）
   * @param workId
   * @param workSetIds
   */
  public async updateLinks(workId: number, workSetIds: number[]) {
    if (ArrayIsEmpty(workSetIds)) {
      return 0
    }

    const oldReList = await this.listByWorkId(workId)

    // 删除已经不存在的关联
    if (ArrayNotEmpty(oldReList)) {
      const notExistingList = oldReList.filter((oldRe) => !workSetIds.some((workSetId) => workSetId === oldRe.id))
      if (ArrayNotEmpty(notExistingList)) {
        await this.deleteBatchById(notExistingList.map((notExisting) => notExisting.id as number))
      }
    }
    return this.linkByWork(workId, workSetIds)
  }

  /**
   * 关联作品和标签
   * @param workId
   */
  public async listByWorkId(workId: number): Promise<ReWorkWorkSet[]> {
    const query = new ReWorkWorkSetQueryDTO()
    query.workId = workId
    return this.list(query)
  }

  /**
   * 从作品集中移除作品
   * @param workId 作品id
   * @param workSetId 作品集id
   */
  public async removeFromWorkSet(workId: number, workSetId: number): Promise<number> {
    const query = new ReWorkWorkSetQueryDTO()
    query.workId = workId
    query.workSetId = workSetId
    return this.delete(query)
  }

  /**
   * 从作品集中批量移除作品
   * @param workIds 作品id列表
   * @param workSetId 作品集id
   */
  public async removeBatchFromWorkSet(workIds: number[], workSetId: number): Promise<number> {
    if (workIds.length === 0) {
      return 0
    }

    // 构建查询条件：workSetId匹配，且workId在列表中
    const query = new ReWorkWorkSetQueryDTO()
    query.workSetId = workSetId
    // 注意：这里需要扩展BaseQueryDTO以支持IN查询，暂时使用循环删除
    // 对于批量操作，可以考虑优化
    let deletedCount = 0
    for (const workId of workIds) {
      const singleQuery = new ReWorkWorkSetQueryDTO()
      singleQuery.workId = workId
      singleQuery.workSetId = workSetId
      deletedCount += await this.delete(singleQuery)
    }
    return deletedCount
  }

  /**
   * 批量更新作品集内作品的排序顺序
   * @param workSetId 作品集id
   * @param workIds 排序后的作品id列表（顺序即为排序值）
   */
  public async updateSortOrders(workSetId: number, workIds: number[]): Promise<number> {
    if (workIds.length === 0) {
      return 0
    }

    let updatedCount = 0
    for (let i = 0; i < workIds.length; i++) {
      const workId = workIds[i]
      const query = new ReWorkWorkSetQueryDTO()
      query.workId = workId
      query.workSetId = workSetId
      const links = await this.list(query)
      if (links.length > 0) {
        const link = links[0]
        link.sortOrder = i + 1
        await this.dao.save(link)
        updatedCount++
      }
    }
    return updatedCount
  }
}
