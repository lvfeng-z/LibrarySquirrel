import { SearchCondition, SearchType } from '@shared/model/util/SearchCondition.js'
import { MediaExtMapping, MediaType } from '../constant/MediaType.js'
import { ArrayIsEmpty } from '@shared/util/CommonUtil.ts'
import { Operator } from '../constant/CrudConstant.ts'

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
          // 本地标签：同时匹配直接关联的本地标签和通过站点标签关联的本地标签
          if (query.operator === Operator.NOT_EQUAL) {
            fromAndWhere.from.push(
              `INNER JOIN re_work_tag re_w_t_1 ON ${workTableAlias}.id = re_w_t_1.work_id LEFT JOIN site_tag st ON re_w_t_1.site_tag_id = st.id`
            )
            fromAndWhere.where.push(`NOT (re_w_t_1.local_tag_id = ${query.value} OR st.local_tag_id = ${query.value})`)
          } else {
            fromAndWhere.from.push(
              `INNER JOIN re_work_tag re_w_t_1 ON ${workTableAlias}.id = re_w_t_1.work_id LEFT JOIN site_tag st ON re_w_t_1.site_tag_id = st.id`
            )
            fromAndWhere.where.push(`(re_w_t_1.local_tag_id = ${query.value} OR st.local_tag_id = ${query.value})`)
          }
        }
        if (query.type === SearchType.SITE_TAG) {
          if (query.operator === Operator.NOT_EQUAL) {
            fromAndWhere.from.push(
              `INNER JOIN re_work_tag re_w_t_2 ON ${workTableAlias}.id = re_w_t_2.work_id`
            )
            fromAndWhere.where.push(`re_w_t_2.site_tag_id <> ${query.value}`)
          } else {
            fromAndWhere.from.push(
              `INNER JOIN re_work_tag re_w_t_2 ON ${workTableAlias}.id = re_w_t_2.work_id`
            )
            fromAndWhere.where.push(`re_w_t_2.site_tag_id = ${query.value}`)
          }
        }
        if (query.type === SearchType.LOCAL_AUTHOR) {
          // 本地作者：同时匹配直接关联的本地作者和通过站点作者关联的本地作者
          if (query.operator === Operator.NOT_EQUAL) {
            fromAndWhere.from.push(
              `INNER JOIN re_work_author re_w_a_1 ON ${workTableAlias}.id = re_w_a_1.work_id LEFT JOIN site_author sa ON re_w_a_1.site_author_id = sa.id`
            )
            fromAndWhere.where.push(`NOT (re_w_a_1.local_author_id = ${query.value} OR sa.local_author_id = ${query.value})`)
          } else {
            fromAndWhere.from.push(
              `INNER JOIN re_work_author re_w_a_1 ON ${workTableAlias}.id = re_w_a_1.work_id LEFT JOIN site_author sa ON re_w_a_1.site_author_id = sa.id`
            )
            fromAndWhere.where.push(`(re_w_a_1.local_author_id = ${query.value} OR sa.local_author_id = ${query.value})`)
          }
        }
        if (query.type === SearchType.SITE_AUTHOR) {
          if (query.operator === Operator.NOT_EQUAL) {
            fromAndWhere.from.push(
              `INNER JOIN re_work_author re_w_a_2 ON ${workTableAlias}.id = re_w_a_2.work_id`
            )
            fromAndWhere.where.push(`re_w_a_2.site_author_id <> ${query.value}`)
          } else {
            fromAndWhere.from.push(
              `INNER JOIN re_work_author re_w_a_2 ON ${workTableAlias}.id = re_w_a_2.work_id`
            )
            fromAndWhere.where.push(`re_w_a_2.site_author_id = ${query.value}`)
          }
        }
        if (query.type === SearchType.WORKS_SITE_NAME) {
          if (query.operator === Operator.LIKE) {
            fromAndWhere.where.push(`${workTableAlias}.site_work_name LIKE '%${query.value}%'`)
          } else if (query.operator === Operator.NOT_EQUAL) {
            fromAndWhere.where.push(`${workTableAlias}.site_work_name <> '${query.value}'`)
          } else {
            fromAndWhere.where.push(`${workTableAlias}.site_work_name = '${query.value}'`)
          }
        }
        if (query.type === SearchType.WORKS_NICKNAME) {
          if (query.operator === Operator.LIKE) {
            fromAndWhere.where.push(`${workTableAlias}.nick_name LIKE '%${query.value}%'`)
          } else if (query.operator === Operator.NOT_EQUAL) {
            fromAndWhere.where.push(`${workTableAlias}.nick_name <> '${query.value}'`)
          } else {
            fromAndWhere.where.push(`${workTableAlias}.nick_name = '${query.value}'`)
          }
        }
        if (query.type === SearchType.WORKS_UPLOAD_TIME) {
          if (query.operator === Operator.NOT_EQUAL) {
            fromAndWhere.where.push(`${workTableAlias}.site_upload_time <> '${query.value}'`)
          } else {
            fromAndWhere.where.push(`${workTableAlias}.site_upload_time = '${query.value}'`)
          }
        }
        if (query.type === SearchType.WORKS_LAST_VIEW) {
          if (query.operator === Operator.NOT_EQUAL) {
            fromAndWhere.where.push(`${workTableAlias}.last_view <> ${query.value}`)
          } else {
            fromAndWhere.where.push(`${workTableAlias}.last_view = ${query.value}`)
          }
        }
        if (query.type === SearchType.MEDIA_TYPE) {
          const extList = MediaExtMapping[query.value as MediaType]
          if (query.operator === Operator.NOT_EQUAL) {
            fromAndWhere.where.push(
              `${workTableAlias}.filename_extension NOT IN (${extList.join(',')})`
            )
          } else {
            fromAndWhere.where.push(
              `${workTableAlias}.filename_extension IN (${extList.join(',')})`
            )
          }
        }
        if (query.type === SearchType.WORK_SET) {
          // 排除指定作品集下的作品
          fromAndWhere.from.push(`LEFT JOIN re_work_work_set rwws ON ${workTableAlias}.id = rwws.work_id`)
          fromAndWhere.where.push(`rwws.work_set_id <> ${query.value}`)
        }
      })
      return {
        from: fromAndWhere.from.join(' '),
        where: fromAndWhere.where.join(' AND ')
      }
    }
  }

  /**
   * 生成 WHERE 子句数组（仅生成 WHERE 条件，不包含 FROM）
   * @param searchConditions 搜索条件数组
   * @param workTableAlias 作品表的别名
   * @returns WHERE 子句数组
   */
  public static generateWhereClauses(
    searchConditions: SearchCondition[],
    workTableAlias: string = 't1'
  ): string[] {
    if (ArrayIsEmpty(searchConditions)) {
      return []
    }
    const whereClauses: string[] = []
    searchConditions.forEach((query) => {
      if (query.type === SearchType.LOCAL_TAG) {
        // 本地标签：同时匹配直接关联的本地标签和通过站点标签关联的本地标签
        if (query.operator === Operator.NOT_EQUAL) {
          whereClauses.push(
            `NOT EXISTS(SELECT 1 FROM re_work_tag rwt
             LEFT JOIN site_tag st ON rwt.site_tag_id = st.id
             WHERE rwt.work_id = ${workTableAlias}.id AND (rwt.local_tag_id = ${query.value} OR st.local_tag_id = ${query.value}))`
          )
        } else {
          whereClauses.push(
            `EXISTS(SELECT 1 FROM re_work_tag rwt
             LEFT JOIN site_tag st ON rwt.site_tag_id = st.id
             WHERE rwt.work_id = ${workTableAlias}.id AND (rwt.local_tag_id = ${query.value} OR st.local_tag_id = ${query.value}))`
          )
        }
      }
      if (query.type === SearchType.SITE_TAG) {
        if (query.operator === Operator.NOT_EQUAL) {
          whereClauses.push(
            `NOT EXISTS(SELECT 1 FROM re_work_tag rwt WHERE rwt.work_id = ${workTableAlias}.id AND rwt.site_tag_id = ${query.value})`
          )
        } else {
          whereClauses.push(
            `EXISTS(SELECT 1 FROM re_work_tag rwt WHERE rwt.work_id = ${workTableAlias}.id AND rwt.site_tag_id = ${query.value})`
          )
        }
      }
      if (query.type === SearchType.LOCAL_AUTHOR) {
        // 本地作者：同时匹配直接关联的本地作者和通过站点作者关联的本地作者
        if (query.operator === Operator.NOT_EQUAL) {
          whereClauses.push(
            `NOT EXISTS(SELECT 1 FROM re_work_author rwa
             LEFT JOIN site_author sa ON rwa.site_author_id = sa.id
             WHERE rwa.work_id = ${workTableAlias}.id AND (rwa.local_author_id = ${query.value} OR sa.local_author_id = ${query.value}))`
          )
        } else {
          whereClauses.push(
            `EXISTS(SELECT 1 FROM re_work_author rwa
             LEFT JOIN site_author sa ON rwa.site_author_id = sa.id
             WHERE rwa.work_id = ${workTableAlias}.id AND (rwa.local_author_id = ${query.value} OR sa.local_author_id = ${query.value}))`
          )
        }
      }
      if (query.type === SearchType.SITE_AUTHOR) {
        if (query.operator === Operator.NOT_EQUAL) {
          whereClauses.push(
            `NOT EXISTS(SELECT 1 FROM re_work_author rwa WHERE rwa.work_id = ${workTableAlias}.id AND rwa.site_author_id = ${query.value})`
          )
        } else {
          whereClauses.push(
            `EXISTS(SELECT 1 FROM re_work_author rwa WHERE rwa.work_id = ${workTableAlias}.id AND rwa.site_author_id = ${query.value})`
          )
        }
      }
      if (query.type === SearchType.WORKS_SITE_NAME) {
        if (query.operator === Operator.LIKE) {
          whereClauses.push(`${workTableAlias}.site_work_name LIKE '%${query.value}%'`)
        } else if (query.operator === Operator.NOT_EQUAL) {
          whereClauses.push(`${workTableAlias}.site_work_name <> '${query.value}'`)
        } else {
          whereClauses.push(`${workTableAlias}.site_work_name = '${query.value}'`)
        }
      }
      if (query.type === SearchType.WORKS_NICKNAME) {
        if (query.operator === Operator.LIKE) {
          whereClauses.push(`${workTableAlias}.nick_name LIKE '%${query.value}%'`)
        } else if (query.operator === Operator.NOT_EQUAL) {
          whereClauses.push(`${workTableAlias}.nick_name <> '${query.value}'`)
        } else {
          whereClauses.push(`${workTableAlias}.nick_name = '${query.value}'`)
        }
      }
      if (query.type === SearchType.WORKS_UPLOAD_TIME) {
        if (query.operator === Operator.NOT_EQUAL) {
          whereClauses.push(`${workTableAlias}.site_upload_time <> '${query.value}'`)
        } else {
          whereClauses.push(`${workTableAlias}.site_upload_time = '${query.value}'`)
        }
      }
      if (query.type === SearchType.WORKS_LAST_VIEW) {
        if (query.operator === Operator.NOT_EQUAL) {
          whereClauses.push(`${workTableAlias}.last_view <> ${query.value}`)
        } else {
          whereClauses.push(`${workTableAlias}.last_view = ${query.value}`)
        }
      }
      if (query.type === SearchType.MEDIA_TYPE) {
        const extList = MediaExtMapping[query.value as MediaType]
        if (query.operator === Operator.NOT_EQUAL) {
          whereClauses.push(`${workTableAlias}.filename_extension NOT IN (${extList.join(',')})`)
        } else {
          whereClauses.push(`${workTableAlias}.filename_extension IN (${extList.join(',')})`)
        }
      }
      if (query.type === SearchType.WORK_SET) {
        // 排除指定作品集下的作品
        whereClauses.push(`NOT EXISTS(SELECT 1 FROM re_work_work_set rwws WHERE rwws.work_id = ${workTableAlias}.id AND rwws.work_set_id = ${query.value})`)
      }
    })
    return whereClauses
  }

  /**
   * 生成 EXISTS 子查询条件，用于检查作品集中是否有符合条件的产品
   * @param searchConditions 搜索条件数组
   * @returns EXISTS 子查询字符串
   */
  public static generateExistsClause(searchConditions: SearchCondition[]): string {
    const whereClauses = this.generateWhereClauses(searchConditions, 'w')
    if (whereClauses.length === 0) {
      return ''
    }
    return `EXISTS (
      SELECT 1 FROM work w
      INNER JOIN re_work_work_set rwws ON w.id = rwws.work_id
      WHERE rwws.work_set_id = work_set.id AND ${whereClauses.join(' AND ')}
    )`
  }
}
