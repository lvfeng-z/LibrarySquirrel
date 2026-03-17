import BaseDao from '../base/BaseDao.ts'
import LocalAuthor from '@shared/model/entity/LocalAuthor.ts'
import LocalAuthorQueryDTO from '@shared/model/queryDTO/LocalAuthorQueryDTO.ts'
import { Database } from '../database/Database.ts'
import RankedLocalAuthor from '@shared/model/domain/RankedLocalAuthor.ts'
import RankedLocalAuthorWithWorkId from '@shared/model/domain/RankedLocalAuthorWithWorkId.ts'

/**
 * 本地作者Dao
 */
export default class LocalAuthorDao extends BaseDao<LocalAuthorQueryDTO, LocalAuthor> {
  constructor() {
    super('local_author', LocalAuthor)
  }

  /**
   * 批量获取作品与作者的关联
   * @param workIds
   */
  public async listReWorkAuthor(workIds: number[]): Promise<Map<number, RankedLocalAuthor[]>> {
    if (workIds.length === 0) {
      throw new Error('查询作品与作者联系失败，作品id列表不能为空')
    }
    const statement = `SELECT t2.work_id, t1.*
                       FROM local_author t1
                              INNER JOIN re_work_author t2 ON t1.id = t2.local_author_id
                       WHERE t2.work_id IN (${workIds.join(',')})`
    const rows = await Database.all<unknown[], Record<string, unknown>>(statement)
    type relationShipType = RankedLocalAuthor & { workId: number }
    const relationShips = this.toResultTypeDataList<relationShipType>(rows)

    // 返回一个workId为键，相同workId的元素为数组为值的Map
    return relationShips.reduce((map: Map<number, RankedLocalAuthor[]>, relationShip: relationShipType) => {
      const workId = relationShip.workId
      if (!map.has(workId)) {
        map.set(workId, [])
      }
      map.get(workId)?.push(relationShip)
      return map
    }, new Map<number, RankedLocalAuthor[]>())
  }

  /**
   * 查询作品的本地作者
   * @param workId 作品id
   */
  async listDTOByWorkId(workId: number): Promise<RankedLocalAuthor[]> {
    const statement = `SELECT t1.*, t2.author_rank
                       FROM local_author t1
                              INNER JOIN re_work_author t2 ON t1.id = t2.local_author_id
                              INNER JOIN work t3 ON t2.work_id = t3.id
                       WHERE t3.id = ${workId}`
    const runResult = await Database.all<unknown[], Record<string, unknown>>(statement)
    return this.toResultTypeDataList<RankedLocalAuthor>(runResult)
  }

  /**
   * 查询作品的本地作者列表
   * @param workIds 作品id列表
   */
  async listRankedLocalAuthorWithWorkIdByWorkIds(workIds: number[]): Promise<RankedLocalAuthorWithWorkId[]> {
    const statement = `SELECT t1.*, t2.author_rank, t2.work_id
                       FROM local_author t1
                              INNER JOIN re_work_author t2 ON t1.id = t2.local_author_id
                              INNER JOIN work t3 ON t2.work_id = t3.id
                       WHERE t3.id IN (${workIds.join(',')})`
    const runResult = await Database.all<unknown[], Record<string, unknown>>(statement)
    return this.toResultTypeDataList<RankedLocalAuthorWithWorkId>(runResult)
  }
}
