import LocalTag from '../model/LocalTag'
import SelectItem from '../model/utilModels/SelectItem'
import StringUtil from '../util/StringUtil'
import LocalTagQueryDTO from '../model/queryDTO/LocalTagQueryDTO'
import { AbstractBaseDao } from './BaseDao'
import { PageModel } from '../model/utilModels/PageModel'

export class LocalTagDao extends AbstractBaseDao<LocalTagQueryDTO, LocalTag> {
  constructor() {
    super('local_tag', 'LocalTagDao')
  }
  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }

  public async queryPage(
    page: PageModel<LocalTagQueryDTO, LocalTag>
  ): Promise<PageModel<LocalTagQueryDTO, LocalTag>> {
    const db = super.acquire()
    try {
      const selectClause = 'select * from local_tag'
      let whereClauses: string = ''
      const columns: string[] = []
      if (page.query) {
        if (page.query.id != undefined) {
          columns.push('id = @id')
        }
        if (page.query.baseLocalTagId != undefined) {
          columns.push('base_local_tag_id = @baseLocalTagId')
        }
        if (page.query.localTagName != undefined && page.query.localTagName != '') {
          columns.push('local_tag_name like @localTagName')
        }
        if (page.query.keyword != undefined && page.query.keyword != '') {
          columns.push('local_tag_name like @keyword')
          const temp = new LocalTagQueryDTO(page.query as LocalTagQueryDTO)
          page.query.keyword = temp.getKeywordLikeString()
        }
      }

      if (columns.length == 1) {
        whereClauses = ' where ' + columns.toString()
      } else if (columns.length > 1) {
        whereClauses = ' where ' + columns.join(' and ')
      }

      // 拼接查询语句
      let statement = selectClause + whereClauses
      // 拼接排序和分页字句
      statement = await this.sorterAndPager(statement, whereClauses, page)

      page.data = this.getResultTypeDataList((await db.prepare(statement)).all(page.query) as [])
      return page
    } finally {
      db.release()
    }
  }

  public async getSelectList(queryDTO: LocalTagQueryDTO): Promise<SelectItem[]> {
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

      return (await db.prepare(sql)).all(values) as SelectItem[]
    } finally {
      db.release()
    }
  }
}
