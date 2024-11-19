import BaseDao from './BaseDao.ts'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.ts'
import Works from '../model/Works.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import lodash from 'lodash'
import DB from '../database/DB.ts'
import { ReWorksTagTypeEnum } from '../constant/ReWorksTagTypeEnum.ts'

export class WorksDao extends BaseDao<WorksQueryDTO, Works> {
  constructor(db?: DB) {
    super('works', 'WorksDao', db)
  }

  /**
   * 综合查询作品
   * @param page 查询参数（本地标签、站点标签、作者...）
   */
  public async synthesisQueryPage(page: PageModel<WorksQueryDTO, WorksDTO>): Promise<PageModel<WorksQueryDTO, WorksDTO>> {
    // 创建一个新的PageModel实例存储修改过的查询条件
    const modifiedPage = new PageModel(page)
    let statement: string
    const selectClause = `select t1.*`
    const fromClause = `from works t1`
    let whereClause: string | undefined
    if (modifiedPage.query !== undefined && page.query !== undefined) {
      const baseProperties = lodash.cloneDeep(modifiedPage.query)
      // 去掉虚拟列
      delete baseProperties.includeLocalTagIds
      delete baseProperties.excludeLocalTagIds
      delete baseProperties.includeSiteTagIds
      delete baseProperties.excludeSiteTagIds
      // 生成实际列的where子句
      const whereClausesAndQuery = this.getWhereClauses(baseProperties, 't1')

      const whereClauses = Object.entries(whereClausesAndQuery.whereClauses).map((item) => item[1])

      modifiedPage.query = whereClausesAndQuery.query

      // 补充虚拟列的where子句
      if (
        page.query.includeLocalTagIds !== undefined &&
        page.query.includeLocalTagIds !== null &&
        page.query.includeLocalTagIds.length > 0
      ) {
        const tagNum = page.query.includeLocalTagIds.length
        whereClauses.push(
          `${tagNum} = (select count(1) from re_works_tag ct1 where ct1.works_id = t1.id and ct1.local_tag_id in (${page.query.includeLocalTagIds.join()}) and ct1.tag_type = ${ReWorksTagTypeEnum.LOCAL})`
        )
      }
      if (
        page.query.excludeLocalTagIds !== undefined &&
        page.query.excludeLocalTagIds !== null &&
        page.query.excludeLocalTagIds.length > 0
      ) {
        whereClauses.push(
          `0 = (select count(1) from re_works_tag ct2 where ct2.works_id = t1.id and ct1.local_tag_id in (${page.query.excludeLocalTagIds.join()}) and ct2.tag_type = ${ReWorksTagTypeEnum.LOCAL})`
        )
      }
      if (
        page.query.includeSiteTagIds !== undefined &&
        page.query.includeSiteTagIds !== null &&
        page.query.includeSiteTagIds.length > 0
      ) {
        const tagNum = page.query.includeSiteTagIds.length
        whereClauses.push(
          `${tagNum} = (select count(1) from re_works_tag ct3 where ct3.works_id = t1.id and ct1.site_tag_id in (${page.query.includeSiteTagIds.join()}) and ct3.tag_type = ${ReWorksTagTypeEnum.SITE})`
        )
      }
      if (
        page.query.excludeSiteTagIds !== undefined &&
        page.query.excludeSiteTagIds !== null &&
        page.query.excludeSiteTagIds.length > 0
      ) {
        whereClauses.push(
          `0 = (select count(1) from re_works_tag ct4 where ct4.works_id = t1.id and ct1.site_tag_id in (${page.query.excludeSiteTagIds.join()}) and ct4.tag_type = ${ReWorksTagTypeEnum.SITE})`
        )
      }

      // 拼接where子句
      whereClause = this.splicingWhereClauses(whereClauses)

      // 拼接语句
      statement = selectClause.concat(' ', fromClause)
      if (whereClause !== undefined) {
        statement = statement.concat(' ', whereClause)
      }
    } else {
      // 拼接语句
      statement = selectClause.concat(' ', fromClause)
    }

    // 排序和分页子句
    statement = await this.sorterAndPager(statement, whereClause, modifiedPage, fromClause)

    const query = modifiedPage.query

    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, query === undefined ? {} : query)
      .then((rows) => {
        const result = this.getResultTypeDataList<WorksDTO>(rows)
        // 利用构造函数处理JSON字符串
        modifiedPage.data = result.map((worksDTO) => new WorksDTO(worksDTO))

        return modifiedPage
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
