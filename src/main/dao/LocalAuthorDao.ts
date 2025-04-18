import BaseDao from '../base/BaseDao.ts'
import LocalAuthor from '../model/entity/LocalAuthor.ts'
import LocalAuthorQueryDTO from '../model/queryDTO/LocalAuthorQueryDTO.ts'
import DB from '../database/DB.ts'
import LocalAuthorRoleDTO from '../model/dto/LocalAuthorRoleDTO.ts'

/**
 * 本地作者Dao
 */
export default class LocalAuthorDao extends BaseDao<LocalAuthorQueryDTO, LocalAuthor> {
  constructor(db: DB, injectedDB: boolean) {
    super('local_author', LocalAuthor, db, injectedDB)
  }

  /**
   * 批量获取作品与作者的关联
   * @param worksIds
   */
  public async listReWorksAuthor(worksIds: number[]): Promise<Map<number, LocalAuthorRoleDTO[]>> {
    if (worksIds.length === 0) {
      throw new Error('查询作品与作者联系失败，作品id列表不能为空')
    }
    const statement = `SELECT t2.works_id, t1.*
                       FROM local_author t1
                              INNER JOIN re_works_author t2 ON t1.id = t2.local_author_id
                       WHERE t2.works_id IN (${worksIds.join(',')})`
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((rows) => {
        type relationShipType = LocalAuthorRoleDTO & { worksId: number }
        const relationShips = this.toResultTypeDataList<relationShipType>(rows)

        // 返回一个worksId为键，相同worksId的元素为数组为值的Map
        return relationShips.reduce((map: Map<number, LocalAuthorRoleDTO[]>, relationShip: relationShipType) => {
          const worksId = relationShip.worksId
          if (!map.has(worksId)) {
            map.set(worksId, [])
          }
          map.get(worksId)?.push(relationShip)
          return map
        }, new Map<number, LocalAuthorRoleDTO[]>())
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 查询作品的本地作者
   * @param worksId 作品id
   */
  async listDTOByWorksId(worksId: number): Promise<LocalAuthorRoleDTO[]> {
    const statement = `SELECT t1.*, t2.author_role
                       FROM local_author t1
                              INNER JOIN re_works_author t2 ON t1.id = t2.local_author_id
                              INNER JOIN works t3 ON t2.works_id = t3.id
                       WHERE t3.id = ${worksId}`
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((runResult) => super.toResultTypeDataList<LocalAuthorRoleDTO>(runResult))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
