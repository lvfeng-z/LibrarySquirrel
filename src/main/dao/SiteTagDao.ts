import SiteTag from '../models/SiteTag'
import SelectVO from '../models/utilModels/SelectVO'
import StringUtil from '../util/StringUtil'
import SiteTagQueryDTO from '../models/queryDTO/SiteTagQueryDTO'

async function insert(siteTag: SiteTag) {
  const connection = await global.connectionPool.acquire()
  try {
    connection
      .prepare(
        'insert into site_tag (id, site_id, site_tag_id, site_tag_name, base_site_tag_id, description, local_tag_id) values (@id, @siteId, @siteTagId, @siteTagName, @baseSiteTagId, @description, @localTagId)'
      )
      .run(siteTag)
  } finally {
    global.connectionPool.release(connection)
  }
}

async function getSelectList(queryDTO: SiteTagQueryDTO): Promise<SelectVO[]> {
  const connection = await global.connectionPool.acquire()
  try {
    return new Promise((resolve) => {
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
      const results = connection.prepare(sql).all(values)

      resolve(results)
    })
  } finally {
    global.connectionPool.release(connection)
  }
}

export default {
  insert,
  getSelectList
}
