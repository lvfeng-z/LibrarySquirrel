import LocalTag from '../models/LocalTag'
import SelectVO from '../models/utilModels/SelectVO'
import StringUtil from '../util/StringUtil'

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

async function query(localTag: LocalTag): Promise<LocalTag[]> {
  const connection = await global.connectionPool.acquire()
  try {
    return new Promise((resolve) => {
      const selectFrom = 'select * from local_tag'
      let where: string = ''
      const columns: string[] = []
      if (localTag.id != undefined) {
        columns.push('id = ' + localTag.id)
      }
      if (localTag.baseLocalTagId != undefined) {
        columns.push('base_local_tag_id = ' + localTag.baseLocalTagId)
      }
      if (localTag.localTagName != undefined && localTag.localTagName != '') {
        columns.push('local_tag_name = ' + localTag.localTagName)
      }

      if (columns.length == 1) {
        where = ' where ' + columns.toString()
      } else if (columns.length > 1) {
        where = ' where ' + columns.join(' and ')
      }
      const sql = selectFrom + where
      resolve(connection.prepare(sql).all())
    })
  } finally {
    global.connectionPool.release(connection)
  }
}

async function getSelectList(keyword: string): Promise<SelectVO[]> {
  const connection = await global.connectionPool.acquire()
  try {
    return new Promise((resolve) => {
      let results: SelectVO[]
      let sql: string

      if (StringUtil.isNotBlank(keyword)) {
        sql =
          'select id as value, local_tag_name as label, base_local_tag_id as rootId from local_tag where local_tag_name like ?'
        results = connection.prepare(sql).all('%' + keyword + '%')
      } else {
        sql =
          'select id as value, local_tag_name as label, base_local_tag_id as rootId from local_tag'
        results = connection.prepare(sql).all()
      }
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
