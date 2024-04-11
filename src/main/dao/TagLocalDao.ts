import TagLocal from '../models/TagLocal'
import SelectVO from "../models/utilModels/SelectVO";
import StringUtil from "../util/StringUtil";

async function insertTagLocal(tagLocal: TagLocal) {
  const connection = await global.connectionPool.acquire()
  try {
    connection
      .prepare(
        'insert into tag_local (id, local_tag_name, base_local_tag_id) values (@id, @localTagName, @baseLocalTagId)'
      )
      .run(tagLocal)
  } finally {
    global.connectionPool.release(connection)
  }
}

async function queryTagLocal(tagLocal: TagLocal): Promise<TagLocal[]> {
  const connection = await global.connectionPool.acquire()
  try {
    return new Promise((resolve) => {
      const selectFrom = 'select * from tag_local'
      const filter: string[] = []
      if (tagLocal.id != undefined) {
        filter.push('id = ' + tagLocal.id)
      }
      if (tagLocal.baseLocalTagId != undefined) {
        filter.push('base_local_tag_id = ' + tagLocal.baseLocalTagId)
      }
      if (tagLocal.localTagName != undefined && tagLocal.localTagName != '') {
        filter.push('local_tag_name = ' + tagLocal.localTagName)
      }

      let where: string = ''
      if (filter.length == 1) {
        where = ' where ' + filter.toString()
      } else if (filter.length > 1) {
        where = ' where ' + filter.join(' and ')
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
          'select id as value, local_tag_name as label, base_local_tag_id as rootId from tag_local where local_tag_name like ?'
        results = connection.prepare(sql).all('%' + keyword + '%')
      } else {
        sql =
          'select id as value, local_tag_name as label, base_local_tag_id as rootId from tag_local'
        results = connection.prepare(sql).all()
      }
      resolve(results)
    })
  } finally {
    global.connectionPool.release(connection)
  }
}

export default {
  insertTagLocal,
  queryTagLocal,
  getSelectList
}
