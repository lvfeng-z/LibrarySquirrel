import LocalTag from '../models/LocalTag'
import SelectVO from '../models/utilModels/SelectVO'
import StringUtil from '../util/StringUtil'
import LocalTagQueryDTO from '../models/queryDTO/LocalTagQueryDTO'

async function insert(localTag: LocalTag) {
  const connection = await global.connectionPool.acquire()
  try {
    connection
      .prepare(
        'insert into local_tag (id, local_tag_name, base_local_tag_id) values (@id, @localTagName, @baseLocalTagId)'
      )
      .run(localTag)
  } finally {
    global.connectionPool.release(connection)
  }
}

async function query(queryDTO: LocalTagQueryDTO): Promise<LocalTag[]> {
  const connection = await global.connectionPool.acquire()
  try {
    return new Promise((resolve) => {
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
      resolve(connection.prepare(sql).all(values))
    })
  } finally {
    global.connectionPool.release(connection)
  }
}

async function getSelectList(queryDTO: LocalTagQueryDTO): Promise<SelectVO[]> {
  console.log('LocalTagDao.ts', queryDTO)
  const connection = await global.connectionPool.acquire()
  try {
    return new Promise((resolve) => {
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

      const results = connection.prepare(sql).all(values)

      resolve(results)
    })
  } finally {
    global.connectionPool.release(connection)
  }
}

export default {
  insert,
  query,
  getSelectList
}
