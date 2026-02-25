import { SearchCondition, SearchType } from '@shared/model/util/SearchCondition.js'
import { MediaExtMapping, MediaType } from '../constant/MediaType.js'
import { ArrayIsEmpty } from '@shared/util/CommonUtil.ts'

/**
 * 搜索条件工具类
 * 用于生成 SQL 查询条件，支持作品的多种搜索类型
 */
export class SearchConditionUtil {
  /**
   * 根据搜索条件生成 FROM 和 WHERE 子句
   * @param searchConditions 搜索条件数组
   * @param workTableAlias 作品表的别名
   * @returns 包含 from 和 where 子句的对象
   */
  public static generateClause(
    searchConditions: SearchCondition[],
    workTableAlias: string = 'work_m'
  ): { from: string; where: string } {
    if (ArrayIsEmpty(searchConditions)) {
      return { from: '', where: '' }
    } else {
      const fromAndWhere: { from: string[]; where: string[] } = { from: [], where: [] }
      searchConditions.forEach((query) => {
        if (query.type === SearchType.LOCAL_TAG) {
          fromAndWhere.from.push(
            `INNER JOIN re_work_tag re_w_t_1 ON ${workTableAlias}.id = re_w_t_1.work_id`
          )
          fromAndWhere.where.push(`re_w_t_1.local_tag_id = ${query.value}`)
        }
        if (query.type === SearchType.SITE_TAG) {
          fromAndWhere.from.push(
            `INNER JOIN re_work_tag re_w_t_2 ON ${workTableAlias}.id = re_w_t_2.work_id`
          )
          fromAndWhere.where.push(`re_w_t_2.site_tag_id = ${query.value}`)
        }
        if (query.type === SearchType.LOCAL_AUTHOR) {
          fromAndWhere.from.push(
            `INNER JOIN re_work_author re_w_a_1 ON ${workTableAlias}.id = re_w_a_1.work_id`
          )
          fromAndWhere.where.push(`re_w_a_1.local_author_id = ${query.value}`)
        }
        if (query.type === SearchType.SITE_AUTHOR) {
          fromAndWhere.from.push(
            `INNER JOIN re_work_author re_w_a_2 ON ${workTableAlias}.id = re_w_a_2.work_id`
          )
          fromAndWhere.where.push(`re_w_a_2.site_author_id = ${query.value}`)
        }
        if (query.type === SearchType.WORKS_SITE_NAME) {
          fromAndWhere.where.push(`${workTableAlias}.site_work_name LIKE '%${query.value}%'`)
        }
        if (query.type === SearchType.WORKS_NICKNAME) {
          fromAndWhere.where.push(`${workTableAlias}.nick_name LIKE '%${query.value}%'`)
        }
        if (query.type === SearchType.WORKS_UPLOAD_TIME) {
          fromAndWhere.where.push(`${workTableAlias}.site_upload_time = ${query.value}`)
        }
        if (query.type === SearchType.WORKS_LAST_VIEW) {
          fromAndWhere.where.push(`${workTableAlias}.last_view = ${query.value}`)
        }
        if (query.type === SearchType.MEDIA_TYPE) {
          const extList = MediaExtMapping[query.value as MediaType]
          fromAndWhere.where.push(
            `${workTableAlias}.filename_extension IN (${extList.join(',')})`
          )
        }
      })
      return {
        from: fromAndWhere.from.join(' '),
        where: fromAndWhere.where.join(' AND ')
      }
    }
  }

  /**
   * 生成 EXISTS 子查询条件，用于检查作品集中是否有符合条件的产品
   * @param searchConditions 搜索条件数组
   * @returns EXISTS 子查询字符串
   */
  public static generateExistsClause(searchConditions: SearchCondition[]): string {
    const { from, where } = this.generateClause(searchConditions, 'w')
    if (!from && !where) {
      return ''
    }
    return `EXISTS (
      SELECT 1 FROM work w
      INNER JOIN re_work_work_set rwws ON w.id = rwws.work_id
      ${from}
      WHERE rwws.work_set_id = work_set.id ${where ? 'AND ' + where : ''}
    )`
  }
}
