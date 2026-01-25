import BaseDao from '../base/BaseDao.ts'
import LocalAuthor from '../model/entity/LocalAuthor.ts'
import LocalAuthorQueryDTO from '../model/queryDTO/LocalAuthorQueryDTO.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import RankedLocalAuthor from '../model/domain/RankedLocalAuthor.ts'
import RankedLocalAuthorWithWorkId from '../model/domain/RankedLocalAuthorWithWorkId.ts'

/**
 * 本地作者Dao
 */
export default class LocalAuthorDao extends BaseDao<LocalAuthorQueryDTO, LocalAuthor> {
  constructor(db: DatabaseClient, injectedDB: boolean) {
    super('local_author', LocalAuthor, db, injectedDB)
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
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((rows) => {
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
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
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
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((runResult) => super.toResultTypeDataList<RankedLocalAuthor>(runResult))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
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
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((runResult) => super.toResultTypeDataList<RankedLocalAuthorWithWorkId>(runResult))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
