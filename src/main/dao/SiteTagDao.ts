import { AbstractBaseDao } from './BaseDao'
import SiteTag from '../model/SiteTag'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO'
import SelectVO from '../model/utilModels/SelectVO'
import StringUtil from '../util/StringUtil'
import { SiteTagDTO } from '../model/dto/SiteTagDTO'

export class SiteTagDao extends AbstractBaseDao<SiteTag> {
  tableName: string = 'site_tag'

  constructor() {
    super('site_tag', 'SiteTagDao')
  }

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }

  public async updateBindLocalTag(
    localTagId: string | null,
    siteTagIds: string[]
  ): Promise<number> {
    if (siteTagIds.length > 0) {
      const db = super.acquire()
      try {
        const setClause: string[] = []
        siteTagIds.forEach((siteTagId) => {
          setClause.push(`when ${siteTagId} then ${localTagId} `)
        })
        const statement = `update ${this.tableName} set local_tag_id = (case ${setClause.join('')} end) where id in (${siteTagIds.join()})`
        return (await db.prepare(statement)).run().changes
      } finally {
        db.release()
      }
    } else {
      return 0
    }
  }

  public async getSiteTagWithLocalTag(queryDTO: SiteTagQueryDTO): Promise<SiteTagDTO[]> {
    const db = super.acquire()
    try {
      const selectClause =
        "select t1.id, t1.site_id as siteId, t1.site_tag_id as siteTagId, t1.site_tag_name as siteTagName, t1.base_site_tag_id as baseSiteTagId, t1.description, t1.local_tag_id as localTagId, json_object('id', t2.id, 'localTagName', t2.local_tag_name, 'baseLocalTagId', t2.base_local_tag_id) as localTag " +
        'from site_tag t1 inner join local_tag t2 on t1.local_tag_id = t2.id'
      const whereClauses = super.getWhereClauses(queryDTO)

      // 删除用于标识localTagId运算符的属性
      delete whereClauses.bound
      // 如果是bound是false，则查询local_tag_id不等于给定localTagId的
      if (!queryDTO.bound && Object.prototype.hasOwnProperty.call(whereClauses, 'localTagId')) {
        whereClauses.localTagId = 'local_tag_id != @localTagId'
      }

      const whereClauseArray = Object.entries(whereClauses).map((whereClause) => whereClause[1])

      let statement = selectClause
      if (whereClauseArray.length > 0) {
        statement +=
          ' where ' +
          (whereClauseArray.length > 1 ? whereClauseArray.join(' and ') : whereClauseArray[0])
      }
      const results: SiteTagDTO[] = (await db.prepare(statement)).all({
        ...queryDTO
      }) as SiteTagDTO[]

      return results.map((result) => new SiteTagDTO(result))
    } finally {
      db.release()
    }
  }

  public async getSelectList(queryDTO: SiteTagQueryDTO): Promise<SelectVO[]> {
    const db = super.acquire()
    try {
      const selectFrom = 'select id as value, site_tag_name as label from site_tag'
      let where = ''
      const columns: string[] = []
      const values: string[] = []

      if (queryDTO.keyword != undefined && StringUtil.isNotBlank(queryDTO.keyword)) {
        columns.push('site_tag_name like ?')
        values.push('%' + queryDTO.keyword + '%')
      }
      if (queryDTO.sites != undefined && queryDTO.sites.length > 0) {
        columns.push('site_id in (?)') // todo 只用逗号隔开不行
        values.push(queryDTO.sites.toString())
      }
      if (queryDTO.localTagId != undefined) {
        columns.push('local_tag_id = ?')
        values.push(String(queryDTO.localTagId))
      }

      if (columns.length == 1) {
        where = ' where ' + columns.toString()
      } else if (columns.length > 1) {
        where = ' where ' + columns.join(' and ')
      }

      const sql: string = selectFrom + where
      return (await db.prepare(sql)).all(values) as SelectVO[]
    } finally {
      db.release()
    }
  }
}
