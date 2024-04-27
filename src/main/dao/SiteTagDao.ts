import { AbstractBaseDao } from './BaseDao'
import SiteTag from '../model/SiteTag'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO'
import SelectVO from '../model/utilModels/SelectVO'
import StringUtil from '../util/StringUtil'

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

  // public async getSiteTagWithLocalTag(queryDTO: SiteTagQueryDTO) {
  //   const connection = await global.connectionPool.acquire()
  //   try {
  //
  //   } finally {
  //     global.connectionPool
  //   }
  // }

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
