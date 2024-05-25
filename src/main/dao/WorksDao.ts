import BaseDao from './BaseDao.ts'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.ts'
import Works from '../model/Works.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import lodash from 'lodash'
import LogUtil from '../util/LogUtil.ts'

export class WorksDao extends BaseDao<WorksQueryDTO, Works> {
  constructor() {
    super('works', 'WorksDao')
  }

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }

  /**
   * 根据标签分页查询作品
   * @param page 查询参数
   */
  public async queryPage(
    page: PageModel<WorksQueryDTO, WorksDTO>
  ): Promise<PageModel<WorksQueryDTO, WorksDTO>> {
    const db = this.acquire()
    try {
      let statement: string
      const selectClause = `select t1.*, json_object('id', t2.id, 'localAuthorName', t2.local_author_name) as author`
      const fromClause = 'from works t1 left join local_author t2 on t1.local_author_id = t2.id'
      let whereClauses: string[]
      if (page.query !== undefined) {
        const baseProperties = lodash.cloneDeep(page.query)
        // 去掉虚拟列
        delete baseProperties.includeLocalTagIds
        delete baseProperties.excludeLocalTagIds
        delete baseProperties.includeSiteTagIds
        delete baseProperties.excludeSiteTagIds
        // 生成实际列的where子句
        const propertiesWhereClauses = this.getWhereClauses(baseProperties, 't1')
        whereClauses = Object.entries(propertiesWhereClauses).map((item) => item[1])

        // 补充虚拟列的where子句
        if (
          page.query.includeLocalTagIds !== undefined &&
          page.query.includeLocalTagIds !== null &&
          page.query.includeLocalTagIds.length > 0
        ) {
          const tagNum = page.query.includeLocalTagIds.length
          whereClauses.push(
            `${tagNum} = (select count(1) from re_works_tag ct1 where ct1.works_id = t1.id and ct1.tag_id in (${page.query.includeLocalTagIds.join()}) and ct1.tag_type = 1)`
          )
        }
        if (
          page.query.excludeLocalTagIds !== undefined &&
          page.query.excludeLocalTagIds !== null &&
          page.query.excludeLocalTagIds.length > 0
        ) {
          whereClauses.push(
            `0 = (select count(1) from re_works_tag ct2 where ct2.works_id = t1.id and ct1.tag_id in (${page.query.excludeLocalTagIds.join()}) and ct2.tag_type = 1)`
          )
        }
        if (
          page.query.includeSiteTagIds !== undefined &&
          page.query.includeSiteTagIds !== null &&
          page.query.includeSiteTagIds.length > 0
        ) {
          const tagNum = page.query.includeSiteTagIds.length
          whereClauses.push(
            `${tagNum} = (select count(1) from re_works_tag ct3 where ct3.works_id = t1.id and ct1.tag_id in (${page.query.includeSiteTagIds.join()}) and ct3.tag_type = 0)`
          )
        }
        if (
          page.query.excludeSiteTagIds !== undefined &&
          page.query.excludeSiteTagIds !== null &&
          page.query.excludeSiteTagIds.length > 0
        ) {
          whereClauses.push(
            `0 = (select count(1) from re_works_tag ct4 where ct4.works_id = t1.id and ct1.tag_id in (${page.query.excludeSiteTagIds.join()}) and ct4.tag_type = 0)`
          )
        }

        // 拼接where子句
        const whereClause = this.splicingWhereClauses(whereClauses)

        // 拼接语句
        statement = selectClause.concat(' ', fromClause, ' ', whereClause)
      } else {
        // 拼接语句
        statement = selectClause.concat(' ', fromClause)
      }

      // 排序和分页子句
      statement = await this.sorterAndPager(statement, '', page, fromClause)

      const rows = this.getResultTypeDataList<WorksDTO>(
        (await db.prepare(statement)).all(page.query) as []
      )

      // 利用构造函数处理JSON字符串
      page.data = rows.map((worksDTO) => new WorksDTO(worksDTO))
    } catch (error) {
      LogUtil.error('WorksDao', error)
    } finally {
      db.release()
    }
    return page
  }
}
