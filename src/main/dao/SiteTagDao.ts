import BaseDao from './BaseDao.ts'
import SiteTag from '../model/SiteTag.ts'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO.ts'
import SelectItem from '../model/utilModels/SelectItem.ts'
import StringUtil from '../util/StringUtil.ts'
import SiteTagDTO from '../model/dto/SiteTagDTO.ts'
import PageModel from '../model/utilModels/PageModel.ts'

export default class SiteTagDao extends BaseDao.AbstractBaseDao<SiteTagQueryDTO, SiteTag> {
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

  public async getSiteTagWithLocalTag(
    page: PageModel<SiteTagQueryDTO, SiteTag>
  ): Promise<SiteTagDTO[]> {
    const db = super.acquire()
    try {
      // 没有查询参数，构建一个空的
      if (page.query === undefined) {
        page.query = new SiteTagQueryDTO()
      }

      const selectClause = `select t1.id, t1.site_id as siteId, t1.site_tag_id as siteTagId, t1.site_tag_name as siteTagName, t1.base_site_tag_id as baseSiteTagId, t1.description, t1.local_tag_id as localTagId,
                json_object('id', t2.id, 'localTagName', t2.local_tag_name, 'baseLocalTagId', t2.base_local_tag_id) as localTag,
                json_object('id', t3.id, 'siteName', t3.site_name, 'siteDomain', t3.site_domain, 'siteHomepage', t3.site_domain) as site`
      const fromClause = `from site_tag t1
          left join local_tag t2 on t1.local_tag_id = t2.id
          left join site t3 on t1.site_id = t3.id`
      const whereClauses = super.getWhereClauses(page.query, 't1')

      // 删除用于标识localTagId运算符的属性生成的子句
      delete whereClauses.bound
      // 如果是bound是false，则查询local_tag_id不等于给定localTagId的
      if (!page.query.bound && Object.prototype.hasOwnProperty.call(whereClauses, 'localTagId')) {
        whereClauses.localTagId = '(t1.local_tag_id != @localTagId or t1.local_tag_id is null)'
      }

      // 处理keyword
      if (Object.prototype.hasOwnProperty.call(whereClauses, 'keyword')) {
        whereClauses.keyword = 't1.site_tag_name like @keyword'
        page.query.keyword = page.query.getKeywordLikeString()
      }

      const whereClauseArray = Object.entries(whereClauses).map((whereClause) => whereClause[1])

      // 拼接sql语句
      let statement = selectClause + ' ' + fromClause
      const whereClause = super.splicingWhereClauses(whereClauseArray)
      statement += ' ' + whereClause
      statement = await super.sorterAndPager(statement, whereClause, page, fromClause)

      // 查询
      const results: SiteTagDTO[] = (await db.prepare(statement)).all({
        ...page.query
      }) as SiteTagDTO[]

      // 利用构造方法处理localTag的JSON字符串
      return results.map((result) => new SiteTagDTO(result))
    } finally {
      db.release()
    }
  }

  public async getSelectList(queryDTO: SiteTagQueryDTO): Promise<SelectItem[]> {
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
      return (await db.prepare(sql)).all(values) as SelectItem[]
    } finally {
      db.release()
    }
  }
}
