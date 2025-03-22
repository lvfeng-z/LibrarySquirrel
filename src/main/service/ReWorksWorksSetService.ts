import BaseService from '../base/BaseService.ts'
import ReWorksWorksSetQueryDTO from '../model/queryDTO/ReWorksWorksSetQueryDTO.ts'
import ReWorksWorksSet from '../model/entity/ReWorksWorksSet.ts'
import ReWorksWorksSetDao from '../dao/ReWorksWorksSetDao.ts'
import DB from '../database/DB.ts'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish } from '../util/CommonUtil.js'
import LogUtil from '../util/LogUtil.js'
import Works from '../model/entity/Works.js'

export default class ReWorksWorksSetService extends BaseService<ReWorksWorksSetQueryDTO, ReWorksWorksSet, ReWorksWorksSetDao> {
  constructor(db?: DB) {
    super(ReWorksWorksSetDao, db)
  }

  /**
   * 关联作品集和作品
   * @param works
   * @param worksSetId
   */
  public async link(works: Works[], worksSetId: number): Promise<number> {
    // 校验
    const legalWorksList = works.filter((works) => {
      if (IsNullish(works)) {
        LogUtil.warn('WorksSetService', `关联作品集和作品失败，作品信息意外为空`)
        return false
      }
      if (IsNullish(!Object.hasOwn(works, 'id') || works.id)) {
        const siteWorksName = Object.hasOwn(works, 'siteWorksName') ? works.siteWorksName : 'unknown'
        LogUtil.warn('WorksSetService', `关联作品集和作品失败，作品id意外为空，siteWorksName: ${siteWorksName}`)
        return false
      }
      return true
    })

    if (legalWorksList.length === 0) {
      return 0
    }

    // 创建关联对象
    const links = legalWorksList.map((worksDTO) => {
      const reWorksWorksSet = new ReWorksWorksSet()
      reWorksWorksSet.worksId = worksDTO.id
      reWorksWorksSet.worksSetId = worksSetId
      return reWorksWorksSet
    })

    return this.saveBatch(links, true)
  }

  /**
   * 关联作品和标签
   * @param worksId
   * @param worksSetIds
   */
  public async linkByWorks(worksId: number, worksSetIds: number[]): Promise<number> {
    if (ArrayIsEmpty(worksSetIds)) {
      return 0
    }

    // 创建关联对象
    const links = worksSetIds.map((worksSetId) => {
      const reWorksWorksSet = new ReWorksWorksSet()
      reWorksWorksSet.worksId = worksId
      reWorksWorksSet.worksSetId = worksSetId
      return reWorksWorksSet
    })

    return super.saveBatch(links, true)
  }

  /**
   * 更新作品和标签的关联（全量更新）
   * @param worksId
   * @param worksSetIds
   */
  public async updateLinks(worksId: number, worksSetIds: number[]) {
    if (ArrayIsEmpty(worksSetIds)) {
      return 0
    }

    const oldReList = await this.listByWorksId(worksId)

    // 删除已经不存在的关联
    if (ArrayNotEmpty(oldReList)) {
      const notExistingList = oldReList.filter((oldRe) => !worksSetIds.some((worksSetId) => worksSetId === oldRe.id))
      if (ArrayNotEmpty(notExistingList)) {
        await this.deleteBatchById(notExistingList.map((notExisting) => notExisting.id as number))
      }
    }
    return this.linkByWorks(worksId, worksSetIds)
  }

  /**
   * 关联作品和标签
   * @param worksId
   */
  public async listByWorksId(worksId: number): Promise<ReWorksWorksSet[]> {
    const query = new ReWorksWorksSet()
    query.worksId = worksId
    return this.list(query)
  }
}
