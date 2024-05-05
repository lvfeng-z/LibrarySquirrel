import LocalTag from '../model/LocalTag'
import SelectVO from '../model/utilModels/SelectVO'
import StringUtil from '../util/StringUtil'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO'
import { AbstractBaseDao } from './BaseDao'

export class LocalTagDao extends AbstractBaseDao<LocalTag> {
  constructor() {
    super('local_tag', 'LocalTagDao')
  }
  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }

  public async query(queryDTO: LocalTagQueryDTO): Promise<LocalTag[]> {
    const db = super.acquire()
    try {
      const selectFrom =
        'select id, local_tag_name as localTagName, base_local_tag_id as baseLocalTagId from local_tag'
      let where: string = ''
      const columns: string[] = []
      const values: unknown[] = []
      if (queryDTO.id != undefined) {
        columns.push(' id = ?')
        values.push(queryDTO.id)
      }
      if (queryDTO.baseLocalTagId != undefined) {
        columns.push(' base_local_tag_id = ?')
        values.push(queryDTO.baseLocalTagId)
      }
      if (queryDTO.localTagName != undefined && queryDTO.localTagName != '') {
        columns.push('local_tag_name like ?')
        values.push('%' + queryDTO.localTagName + '%')
      }

      if (columns.length == 1) {
        where = ' where ' + columns.toString()
      } else if (columns.length > 1) {
        where = ' where ' + columns.join(' and ')
      }
      const sql = selectFrom + where
      return (await db.prepare(sql)).all(values) as LocalTag[]
    } finally {
      db.release()
    }
  }

  public async getSelectList(queryDTO: LocalTagQueryDTO): Promise<SelectVO[]> {
    const db = super.acquire()
    try {
      const selectFrom = 'select id as value, local_tag_name as label from local_tag'
      let where = ''
      const columns: string[] = []
      const values: string[] = []

      if (queryDTO.keyword != undefined && StringUtil.isNotBlank(queryDTO.keyword)) {
        columns.push('local_tag_name like ?')
        values.push('%' + queryDTO.keyword + '%')
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
