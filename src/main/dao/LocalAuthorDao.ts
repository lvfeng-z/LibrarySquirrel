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

  /**
   * 批量获取作品与作者的关联
   * @param worksIds
   */
  public async getWorksAuthorRelationShip(
    worksIds: number[]
  ): Promise<Map<number, LocalAuthorDTO[]>> {
    if (worksIds.length === 0) {
      throw new Error('查询作品与作者联系时，作品id列表不能为空')
    }
    const statement = `select t2.works_id, t1.*
                       from local_author t1
                              inner join re_works_author t2 on t1.id = t2.local_author_id
                       where t2.works_id in (${worksIds.join(',')})`
    const db = this.acquire()
    try {
      const rows = (await db.all(statement)) as object[]
      type relationShipType = LocalAuthorDTO & { worksId: number }
      const relationShips = this.getResultTypeDataList(rows) as relationShipType[]

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
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }
}
