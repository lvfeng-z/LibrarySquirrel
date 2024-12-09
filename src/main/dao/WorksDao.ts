import BaseDao from './BaseDao.ts'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.ts'
import Works from '../model/entity/Works.ts'
import Page from '../model/util/Page.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import lodash from 'lodash'
import DB from '../database/DB.ts'
import { ReWorksTagTypeEnum } from '../constant/ReWorksTagTypeEnum.ts'
import { SearchCondition, SearchType } from '../model/util/SearchCondition.js'
import { arrayIsEmpty, isNullish } from '../util/CommonUtil.js'
import StringUtil from '../util/StringUtil.js'
import { MediaExtMapping, MediaType } from '../util/MediaType.js'

export class WorksDao extends BaseDao<WorksQueryDTO, Works> {
  constructor(db?: DB) {
    super('works', 'WorksDao', db)
  }

  /**
   * 综合查询作品
   * @param page 查询参数（本地标签、站点标签、作者...）
   */
  public async synthesisQueryPage(page: Page<WorksQueryDTO, WorksDTO>): Promise<Page<WorksQueryDTO, WorksDTO>> {
    // 创建一个新的PageModel实例存储修改过的查询条件
    const modifiedPage = new Page(page)
    let statement: string
    const selectClause = `SELECT t1.*`
    const fromClause = `FROM works t1`
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
          `${tagNum} = (SELECT COUNT(1) FROM re_works_tag ct1 WHERE ct1.works_id = t1.id AND ct1.local_tag_id IN (${page.query.includeLocalTagIds.join()}) AND ct1.tag_type = ${ReWorksTagTypeEnum.LOCAL})`
        )
      }
      if (
        page.query.excludeLocalTagIds !== undefined &&
        page.query.excludeLocalTagIds !== null &&
        page.query.excludeLocalTagIds.length > 0
      ) {
        whereClauses.push(
          `0 = (SELECT COUNT(1) FROM re_works_tag ct2 WHERE ct2.works_id = t1.id AND ct1.local_tag_id IN (${page.query.excludeLocalTagIds.join()}) AND ct2.tag_type = ${ReWorksTagTypeEnum.LOCAL})`
        )
      }
      if (
        page.query.includeSiteTagIds !== undefined &&
        page.query.includeSiteTagIds !== null &&
        page.query.includeSiteTagIds.length > 0
      ) {
        const tagNum = page.query.includeSiteTagIds.length
        whereClauses.push(
          `${tagNum} = (SELECT COUNT(1) FROM re_works_tag ct3 WHERE ct3.works_id = t1.id AND ct1.site_tag_id IN (${page.query.includeSiteTagIds.join()}) AND ct3.tag_type = ${ReWorksTagTypeEnum.SITE})`
        )
      }
      if (
        page.query.excludeSiteTagIds !== undefined &&
        page.query.excludeSiteTagIds !== null &&
        page.query.excludeSiteTagIds.length > 0
      ) {
        whereClauses.push(
          `0 = (SELECT COUNT(1) FROM re_works_tag ct4 WHERE ct4.works_id = t1.id AND ct1.site_tag_id IN (${page.query.excludeSiteTagIds.join()}) AND ct4.tag_type = ${ReWorksTagTypeEnum.SITE})`
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
    const sort = isNullish(page.query?.sort) ? {} : page.query.sort
    statement = await this.sortAndPage(statement, whereClause, modifiedPage, sort, fromClause)

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

  /**
   * 多种条件分页查询作品
   * @param page
   * @param query
   */
  public async multipleConditionQueryPage(
    page: Page<WorksQueryDTO, WorksDTO>,
    query: SearchCondition[]
  ): Promise<Page<WorksQueryDTO, WorksDTO>> {
    // 创建一个新的PageModel实例存储修改过的查询条件
    const modifiedPage = new Page(page)
    const fromAndWhere = this.generateClause(query)
    const selectClause = `SELECT works_m.* `
    const fromClause = `FROM works works_m ` + fromAndWhere.from
    const whereClause = fromAndWhere.where
    const statement = selectClause + fromClause + StringUtil.isBlank(whereClause) ? '' : `WHERE ${whereClause}`
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
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

  private generateClause(searchConditions: SearchCondition[]): { from: string; where: string } {
    if (arrayIsEmpty(searchConditions)) {
      return { from: '', where: '' }
    } else {
      const fromAndWhere: { from: string[]; where: string[] } = { from: [], where: [] }
      searchConditions.forEach((query) => {
        if (query.type === SearchType.LOCAL_TAG) {
          fromAndWhere.from.push('INNER JOIN re_works_tag re_w_t_1 ON works_m.id = re_w_t_1.works_id')
          fromAndWhere.where.push(`re_w_t_1.local_tag_id = ${query.value}`)
        }
        if (query.type === SearchType.SITE_TAG) {
          fromAndWhere.from.push('INNER JOIN re_works_tag re_w_t_2 ON works_m.id = re_w_t_2.works_id')
          fromAndWhere.where.push(`re_w_t_2.site_tag_id = ${query.value}`)
        }
        if (query.type === SearchType.LOCAL_AUTHOR) {
          fromAndWhere.from.push('INNER JOIN re_works_author re_w_a_1 ON works_m.id = re_w_a_1.works_id')
          fromAndWhere.where.push(`re_w_a_1.local_author_id = ${query.value}`)
        }
        if (query.type === SearchType.SITE_AUTHOR) {
          fromAndWhere.from.push('INNER JOIN re_works_author re_w_a_2 ON works_m.id = re_w_a_2.works_id')
          fromAndWhere.where.push(`re_w_a_2.site_author_id = ${query.value}`)
        }
        if (query.type === SearchType.WORKS_SITE_NAME) {
          fromAndWhere.where.push(`works_m.site_works_name LIKE %${query.value}%`)
        }
        if (query.type === SearchType.WORKS_NICKNAME) {
          fromAndWhere.where.push(`works_m.nick_name LIKE %${query.value}%`)
        }
        if (query.type === SearchType.WORKS_UPLOAD_TIME) {
          fromAndWhere.where.push(`works_m.site_upload_time = ${query.value}`)
        }
        if (query.type === SearchType.WORKS_LAST_VIEW) {
          fromAndWhere.where.push(`works_m.last_view = ${query.value}`)
        }
        if (query.type === SearchType.MEDIA_TYPE) {
          const extList = MediaExtMapping[query.value as MediaType]
          fromAndWhere.where.push(`works_m.filename_extension IN (${extList.join(',')})`)
        }
      })
      return { from: fromAndWhere.from.join(' '), where: fromAndWhere.where.join(' ') }
    }
  }
}
