import Site from '../model/Site'
import SelectItem from '../model/utilModels/SelectItem'
import StringUtil from '../util/StringUtil'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO'
import { DB } from '../database/DB'
import { AbstractBaseDao } from './BaseDao'

export class SiteDao extends AbstractBaseDao<SiteQueryDTO, Site> {
  constructor() {
    super('site', 'SiteDao')
  }
  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }

  public async getSelectList(queryDTO: SiteQueryDTO): Promise<SelectItem[]> {
    const db = new DB('SiteDao')
    try {
      const selectFrom = 'select id as value, site_name as label from site'
      let where = ''
      const columns: string[] = []
      const values: string[] = []

      if (queryDTO.keyword != undefined && StringUtil.isNotBlank(queryDTO.keyword)) {
        columns.push('site_name like ?')
        values.push('%' + queryDTO.keyword + '%')
      }

      if (columns.length == 1) {
        where = ' where ' + columns.toString()
      } else if (columns.length > 1) {
        where = ' where ' + columns.join(' and ')
      }

      const sql: string = selectFrom + where
      return (await db.prepare(sql)).all(values) as SelectItem[]
    } finally {
      db.release()
    }
  }
}
