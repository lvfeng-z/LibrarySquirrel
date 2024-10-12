import BaseDao from './BaseDao.ts'
import LocalAuthor from '../model/LocalAuthor.ts'
import LocalAuthorQueryDTO from '../model/queryDTO/LocalAuthorQueryDTO.ts'
import DB from '../database/DB.ts'
import LocalAuthorDTO from '../model/dto/LocalAuthorDTO.ts'

/**
 * 本地作者Dao
 */
export default class LocalAuthorDao extends BaseDao<LocalAuthorQueryDTO, LocalAuthor> {
  constructor(db?: DB) {
    super('local_author', 'LocalAuthorDao', db)
  }

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }

  /**
   * 批量获取作品与作者的关联
   * @param worksIds
   */
  public async listReWorksAuthor(worksIds: number[]): Promise<Map<number, LocalAuthorDTO[]>> {
    if (worksIds.length === 0) {
      throw new Error('查询作品与作者联系时，作品id列表不能为空')
    }
    const statement = `select t2.works_id, t1.*
                       from local_author t1
                              inner join re_works_author t2 on t1.id = t2.local_author_id
                       where t2.works_id in (${worksIds.join(',')})`
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((rows) => {
        type relationShipType = LocalAuthorDTO & { worksId: number }
        const relationShips = this.getResultTypeDataList<relationShipType>(rows)

        // 返回一个worksId为键，相同worksId的元素为数组为值的Map
        return relationShips.reduce(
          (map: Map<number, LocalAuthorDTO[]>, relationShip: relationShipType) => {
            const worksId = relationShip.worksId
            if (!map.has(worksId)) {
              map.set(worksId, [])
            }
            map.get(worksId)?.push(relationShip)
            return map
          },
          new Map<number, LocalAuthorDTO[]>()
        )
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 查询作品的本地标签
   * @param worksId 作品id
   */
  async listByWorksId(worksId: number): Promise<LocalAuthorDTO[]> {
    const statement = `select t1.*, t2.author_role
                       from local_author t1
                              inner join re_works_author t2 on t1.id = t2.local_author_id
                              inner join works t3 on t2.works_id = t3.id
                       where t3.id = ${worksId}`
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((runResult) => super.getResultTypeDataList<LocalAuthorDTO>(runResult))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
