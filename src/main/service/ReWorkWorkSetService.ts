import BaseService from '../base/BaseService.ts'
import ReWorkWorkSetQueryDTO from '../model/queryDTO/ReWorkWorkSetQueryDTO.ts'
import ReWorkWorkSet from '../model/entity/ReWorkWorkSet.ts'
import ReWorkWorkSetDao from '../dao/ReWorkWorkSetDao.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish } from '../util/CommonUtil.js'
import LogUtil from '../util/LogUtil.js'
import Work from '../model/entity/Work.ts'

export default class ReWorkWorkSetService extends BaseService<ReWorkWorkSetQueryDTO, ReWorkWorkSet, ReWorkWorkSetDao> {
  constructor(db?: DatabaseClient) {
    super(ReWorkWorkSetDao, db)
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

    // 创建关联对象
    const links = legalWorkList.map((workDTO) => {
      const reWorkWorkSet = new ReWorkWorkSet()
      reWorkWorkSet.workId = workDTO.id
      reWorkWorkSet.workSetId = workSetId
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
}
