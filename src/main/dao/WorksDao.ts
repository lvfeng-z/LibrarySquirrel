import BaseDao from '../base/BaseDao.ts'
import WorksQueryDTO from '../model/queryDTO/WorksQueryDTO.ts'
import WorksCommonQueryDTO from '../model/queryDTO/WorksCommonQueryDTO.js'
import Works from '../model/entity/Works.ts'
import Page from '../model/util/Page.ts'
import WorksFullDTO from '../model/dto/WorksFullDTO.js'
import lodash from 'lodash'
import DB from '../database/DB.ts'
import { SearchCondition, SearchType } from '../model/util/SearchCondition.js'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish, NotNullish } from '../util/CommonUtil.js'
import StringUtil from '../util/StringUtil.js'
import { MediaExtMapping, MediaType } from '../constant/MediaType.js'
import { OriginType } from '../constant/OriginType.js'
import { ToPlainParams } from '../base/BaseQueryDTO.js'
import { BOOL } from '../constant/BOOL.js'

export class WorksDao extends BaseDao<WorksQueryDTO, Works> {
  constructor(db: DB, injectedDB: boolean) {
    super('works', Works, db, injectedDB)
  }

  /**
   * 综合查询作品
   * @param page 查询参数（本地标签、站点标签、作者...）
   */
  public async synthesisQueryPage(page: Page<WorksCommonQueryDTO, WorksFullDTO>): Promise<Page<WorksQueryDTO, WorksFullDTO>> {
    const modifiedPage = new Page(page)
    let statement: string
    const selectClause = `
        SELECT t1.*,
               CASE WHEN t2.id IS NOT NULL THEN
                 JSON_OBJECT(
                      'id', t2.id, 'worksId', t2.works_id, 'taskId', t2.task_id, 'state', t2.state, 'filePath', t2.file_path, 'fileName', t2.file_name, 'filenameExtension', t2.filename_extension,
                      'suggestedName', t2.suggest_name, 'workdir', t2.workdir, 'resourceComplete', t2.resource_complete, 'importMethod', t2.import_method)
               END AS resource,
               (SELECT JSON_GROUP_ARRAY(JSON_OBJECT(
                            'id', rt1.id, 'worksId', rt1.works_id, 'taskId', rt1.task_id, 'state', rt1.state, 'filePath', rt1.file_path, 'fileName', rt1.file_name, 'filenameExtension', rt1.filename_extension,
                            'suggestedName', rt1.suggest_name, 'workdir', rt1.workdir, 'resourceComplete', rt1.resource_complete, 'importMethod', rt1.import_method))
                FROM resource rt1
                WHERE t1.id = rt1.works_id AND rt1.state = ${BOOL.FALSE}) AS inactiveResource,
               (SELECT JSON_GROUP_ARRAY(JSON_OBJECT('id', rt2.id, 'localTagName', rt2.local_tag_name, 'baseLocalTagId', rt2.base_local_tag_id, 'lastUse', rt2.last_use))
                FROM re_works_tag rt1
                         INNER JOIN local_tag rt2 ON rt1.local_tag_id = rt2.id
                WHERE t1.id = rt1.works_id) AS localTags,
               (SELECT JSON_GROUP_ARRAY(JSON_OBJECT(
                            'id', rt2.id, 'siteId', rt2.site_id, 'siteTagId', rt2.site_tag_id, 'siteTagName', rt2.site_tag_name, 'baseSiteTagId', rt2.base_site_tag_id,
                            'description', rt2.description, 'localTagId', rt2.local_tag_id, 'lastUse', rt2.last_use))
                FROM re_works_tag rt1
                         INNER JOIN site_tag rt2 ON rt1.site_tag_id = rt2.id
                WHERE t1.id = rt1.works_id) AS siteTags,
               (SELECT JSON_GROUP_ARRAY(JSON_OBJECT('id', rt2.id, 'localAuthorName', rt2.local_author_name, 'lastUse', rt2.last_use, 'authorRank', rt1.author_rank))
                FROM re_works_author rt1
                         INNER JOIN local_author rt2 ON rt1.local_author_id = rt2.id
                WHERE t1.id = rt1.works_id) AS localAuthors,
               (SELECT JSON_GROUP_ARRAY(JSON_OBJECT(
                            'id', rt2.id, 'siteId', rt2.site_id, 'siteAuthorId', rt2.site_author_id, 'siteAuthorName', rt2.site_author_name, 'siteAuthorNameBefore',
                            rt2.site_author_name_before, 'introduce', rt2.introduce, 'localAuthorId', rt2.local_author_id, 'lastUse', rt2.last_use, 'authorRank', rt1.author_rank))
                FROM re_works_author rt1
                         INNER JOIN site_author rt2 ON rt1.site_author_id = rt2.id
                WHERE 1 = rt1.works_id) AS siteAuthors,
               (SELECT JSON_GROUP_ARRAY(JSON_OBJECT(
                            'id', rt2.id, 'siteId', rt2.site_id, 'siteWorksSetId', rt2.site_works_set_id, 'siteWorksSetName', rt2.site_works_set_name, 'siteAuthorId', rt2.site_author_id,
                            'siteUploadTime', rt2.site_upload_time, 'siteUpdateTime', rt2.site_update_time, 'nickName', rt2.nick_name, 'lastView', rt2.last_view))
                FROM re_works_works_set rt1
                         INNER JOIN works_set rt2 ON rt1.works_set_id = rt2.id
                WHERE t1.id = rt1.works_id) AS worksSets`
    const fromClause = `
        FROM works t1
          LEFT JOIN resource t2 ON t1.id = t2.works_id AND t2.state = ${BOOL.TRUE}`
    let whereClause: string | undefined
    if (modifiedPage.query !== undefined && page.query !== undefined) {
      const baseProperties = lodash.cloneDeep(modifiedPage.query)
      const whereClausesAndQuery = this.getWhereClauses(baseProperties, 't1', WorksCommonQueryDTO.nonFieldProperties())

      const whereClauses = whereClausesAndQuery.whereClauses
        .values()
        .toArray()
        .map((item) => item[1])

      modifiedPage.query = whereClausesAndQuery.query

      // 补充虚拟列的where子句
      if (ArrayNotEmpty(page.query.includeLocalTagIds)) {
        for (const [index, includeLocalTagId] of page.query.includeLocalTagIds.entries()) {
          whereClauses.push(
            `EXISTS(SELECT 1 FROM re_works_tag ct1_1_${index}
                LEFT JOIN site_tag ct1_2_${index} ON ct1_1_${index}.site_tag_id = ct1_2_${index}.id
             WHERE (ct1_1_${index}.local_tag_id = ${includeLocalTagId} OR ct1_2_${index}.local_tag_id = ${includeLocalTagId}) AND ct1_1_${index}.works_id = t1.id)`
          )
        }
      }
      if (ArrayNotEmpty(page.query.excludeLocalTagIds)) {
        for (const [index, excludeLocalTagIds] of page.query.excludeLocalTagIds.entries()) {
          whereClauses.push(
            `NOT EXISTS(SELECT 1 FROM re_works_tag ct2_1_${index}
                LEFT JOIN site_tag ct2_2_${index} ON ct2_1_${index}.site_tag_id = ct2_2_${index}.id
             WHERE (ct2_1_${index}.local_tag_id = ${excludeLocalTagIds} OR ct2_2_${index}.local_tag_id = ${excludeLocalTagIds}) AND ct2_1_${index}.works_id = t1.id)`
          )
        }
      }
      if (ArrayNotEmpty(page.query.includeSiteTagIds)) {
        const tagNum = page.query.includeSiteTagIds.length
        whereClauses.push(
          `${tagNum} = (SELECT COUNT(1) FROM re_works_tag ct3 WHERE ct3.works_id = t1.id AND ct3.site_tag_id IN (${page.query.includeSiteTagIds.join()}) AND ct3.tag_type = ${OriginType.SITE})`
        )
      }
      if (ArrayNotEmpty(page.query.excludeSiteTagIds)) {
        whereClauses.push(
          `0 = (SELECT COUNT(1) FROM re_works_tag ct4 WHERE ct4.works_id = t1.id AND ct4.site_tag_id IN (${page.query.excludeSiteTagIds.join()}) AND ct4.tag_type = ${OriginType.SITE})`
        )
      }
      if (ArrayNotEmpty(page.query.includeLocalAuthorIds)) {
        for (const [index, includeLocalAuthorIds] of page.query.includeLocalAuthorIds.entries()) {
          whereClauses.push(
            `EXISTS(SELECT 1 FROM re_works_author ct5_1_${index}
                LEFT JOIN site_author ct5_2_${index} ON ct5_1_${index}.site_author_id = ct5_2_${index}.id
             WHERE (ct5_1_${index}.local_author_id = ${includeLocalAuthorIds} OR ct5_2_${index}.local_author_id = ${includeLocalAuthorIds}) AND ct5_1_${index}.works_id = t1.id)`
          )
        }
      }
      if (ArrayNotEmpty(page.query.excludeLocalAuthorIds)) {
        for (const [index, excludeLocalAuthorIds] of page.query.excludeLocalAuthorIds.entries()) {
          whereClauses.push(
            `NOT EXISTS(SELECT 1 FROM re_works_author ct6_1_${index}
                LEFT JOIN site_author ct6_2_${index} ON ct6_1_${index}.site_author_id = ct6_2_${index}.id
             WHERE (ct6_1_${index}.local_author_id = ${excludeLocalAuthorIds} OR ct6_2_${index}.local_author_id = ${excludeLocalAuthorIds}) AND ct6_1_${index}.works_id = t1.id)`
          )
        }
      }
      if (ArrayNotEmpty(page.query.includeSiteAuthorIds)) {
        const tagNum = page.query.includeSiteAuthorIds.length
        whereClauses.push(
          `${tagNum} = (SELECT COUNT(1) FROM re_works_author ct7 WHERE ct7.works_id = t1.id AND ct7.site_author_id IN (${page.query.includeSiteAuthorIds.join()}) AND ct7.author_type = ${OriginType.SITE})`
        )
      }
      if (ArrayNotEmpty(page.query.excludeSiteAuthorIds)) {
        whereClauses.push(
          `0 = (SELECT COUNT(1) FROM re_works_author ct8 WHERE ct8.works_id = t1.id AND ct8.site_author_id IN (${page.query.excludeSiteAuthorIds.join()}) AND ct8.author_type = ${OriginType.SITE})`
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

    // 分组
    statement = statement + ' GROUP BY t1.id'

    // 排序和分页子句
    const sort = IsNullish(page.query?.sort) ? [] : page.query.sort
    statement = await this.sortAndPage(statement, modifiedPage, sort, fromClause)

    let query: Record<string, unknown> | undefined = undefined
    if (NotNullish(modifiedPage.query)) {
      query = ToPlainParams(modifiedPage.query)
    }

    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, query === undefined ? {} : query)
      .then((rows) => {
        const result = this.toResultTypeDataList<WorksFullDTO>(rows)
        // 利用构造函数处理JSON字符串
        modifiedPage.data = result.map((raw) => new WorksFullDTO(raw))

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
    page: Page<WorksQueryDTO, WorksFullDTO>,
    query: SearchCondition[]
  ): Promise<Page<WorksQueryDTO, WorksFullDTO>> {
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
        const result = this.toResultTypeDataList<WorksFullDTO>(rows)
        // 利用构造函数处理JSON字符串
        modifiedPage.data = result.map((worksDTO) => new WorksFullDTO(worksDTO))

        return modifiedPage
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  private generateClause(searchConditions: SearchCondition[]): { from: string; where: string } {
    if (ArrayIsEmpty(searchConditions)) {
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

  public async listBySiteIdAndSiteWorksIds(siteIdAndSiteWorksIds: { siteId: number; siteWorksId: string }[]): Promise<Works[]> {
    const selectClause = 'SELECT * FROM works'
    const whereClauses: string[] = []
    let currentIndex: number = 0
    while (siteIdAndSiteWorksIds.length > currentIndex + 1) {
      const batch = siteIdAndSiteWorksIds.slice(currentIndex, currentIndex + 998)
      currentIndex += 998
      const whereClause =
        'WHERE ' +
        batch
          .map(
            (siteIdAndSiteWorksId) =>
              `(site_id ${IsNullish(siteIdAndSiteWorksId.siteId) ? 'IS NULL' : `= ${siteIdAndSiteWorksId.siteId}`} AND site_works_id = '${siteIdAndSiteWorksId.siteWorksId}')`
          )
          .join(' OR ')
      whereClauses.push(whereClause)
    }
    const statement = whereClauses.map((whereClause) => selectClause + ' ' + whereClause).join(' UNION ALL ')
    const db = this.acquire()
    try {
      const rows = await db.all<unknown[], Record<string, unknown>>(statement)
      return super.toResultTypeDataList<Works>(rows)
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }
}
