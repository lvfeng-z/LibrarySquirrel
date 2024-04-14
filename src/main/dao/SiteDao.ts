import Site from '../models/Site'
import SelectVO from '../models/utilModels/SelectVO'
import StringUtil from '../util/StringUtil'
import SiteQueryDTO from '../models/queryDTO/SiteQueryDTO'

async function insert(site: Site) {
  const connection = await global.connectionPool.acquire()
  try {
    connection
      .prepare(
        'insert into site (id, site_name, site_domain, site_homepage) values (@id, @siteName, @siteDomain, @siteHomepage)'
      )
      .run(site)
  } finally {
    global.connectionPool.release(connection)
  }
}

async function getSelectList(queryDTO: SiteQueryDTO): Promise<SelectVO[]> {
  const connection = await global.connectionPool.acquire()
  try {
    return new Promise((resolve) => {
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
