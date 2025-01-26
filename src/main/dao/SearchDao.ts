import BaseQueryDTO from '../base/BaseQueryDTO.js'
import BaseEntity from '../base/BaseEntity.js'
import DB from '../database/DB.js'
import CoreDao from '../base/CoreDao.js'
import Page from '../model/util/Page.js'
import SearchConditionQueryDTO from '../model/queryDTO/SearchConditionQueryDTO.js'
import SelectItem from '../model/util/SelectItem.js'
import { SearchTypes } from '../constant/SearchType.js'
import { SearchType } from '../model/util/SearchCondition.js'
import { ArrayIsEmpty, IsNullish, NotNullish } from '../util/CommonUtil.js'
import StringUtil from '../util/StringUtil.js'
import LogUtil from '../util/LogUtil.js'
import Site from '../model/entity/Site.js'

export default class SearchDao extends CoreDao<BaseQueryDTO, BaseEntity> {
  constructor(db?: DB) {
    super(db)
  }

  public async querySearchConditionPage(page: Page<SearchConditionQueryDTO, BaseEntity>): Promise<Page<SearchTypes, SelectItem>> {
    const query = page.query
    const statements: string[] = []
    const keyword = query?.keywordForFullMatch()
    const hasKeyword = StringUtil.isNotBlank(keyword)
    if (hasKeyword && NotNullish(query)) {
      query.keyword = keyword
    }

    // 本地标签
    if (ArrayIsEmpty(query?.types) || query?.types.includes(SearchType.LOCAL_TAG)) {
      statements.push(
        hasKeyword
          ? `SELECT id || 'localTag' AS value, local_tag_name AS label, last_use, JSON_OBJECT('type', ${SearchType.LOCAL_TAG}, 'id', id) AS extraData FROM local_tag WHERE local_tag_name LIKE @keyword`
          : `SELECT id || 'localTag' AS value, local_tag_name AS label, last_use, JSON_OBJECT('type', ${SearchType.LOCAL_TAG}, 'id', id) AS extraData FROM local_tag`
      )
    }

    // 站点标签
    if (ArrayIsEmpty(query?.types) || query?.types.includes(SearchType.SITE_TAG)) {
      const statement =
        `SELECT t1.id || 'siteTag' AS value, t1.site_tag_name AS label, t1.last_use,
                  JSON_OBJECT(
                    'type', ${SearchType.SITE_TAG},
                    'id', t1.id,
                    'localTag',
                    JSON_OBJECT('id', t2.id, 'localTagName', t2.local_tag_name, 'baseLocalTagId', t2.base_local_tag_id),
                    'site',
                    JSON_OBJECT('id', t3.id, 'siteName', t3.site_name, 'siteDescription', t3.site_description)
                  ) AS extraData
        FROM site_tag t1
               LEFT JOIN local_tag t2 ON t1.local_tag_id = t2.id
               LEFT JOIN site t3 ON t1.site_id = t3.id` + (hasKeyword ? ` WHERE site_tag_name LIKE @keyword` : '')
      statements.push(statement)
    }

    // 本地作者
    if (ArrayIsEmpty(query?.types) || query?.types.includes(SearchType.LOCAL_AUTHOR)) {
      statements.push(
        hasKeyword
          ? `SELECT id || 'localAuthor' AS value, local_author_name AS label, last_use, JSON_OBJECT('type', ${SearchType.LOCAL_AUTHOR}, 'id', id) AS extraData FROM local_author WHERE local_author_name LIKE @keyword`
          : `SELECT id || 'localAuthor' AS value, local_author_name AS label, last_use, JSON_OBJECT('type', ${SearchType.LOCAL_AUTHOR}, 'id', id) AS extraData FROM local_author`
      )
    }

    // 站点作者
    if (ArrayIsEmpty(query?.types) || query?.types.includes(SearchType.SITE_AUTHOR)) {
      const statement =
        `SELECT t1.id || 'siteAuthor' AS value, t1.site_author_name AS label, t1.last_use,
                  JSON_OBJECT(
                    'type', ${SearchType.SITE_AUTHOR},
                    'id', t1.id,
                    'siteAuthor',
                    JSON_OBJECT('id', t2.id, 'siteAuthorName', t2.local_author_name),
                    'site',
                    JSON_OBJECT('id', t3.id, 'siteName', t3.site_name, 'siteDescription', t3.site_description)
                  ) AS extraData
        FROM site_author t1
               LEFT JOIN local_author t2 ON t1.local_author_id = t2.id
               LEFT JOIN site t3 ON t1.site_id = t3.id` + (hasKeyword ? ` WHERE site_author_name LIKE @keyword` : '')
      statements.push(statement)
    }

    // 连接语句
    let statement = `SELECT * FROM (${statements.join(' UNION ALL ')}) t`
    statement = await super.sortAndPage(statement, page, { lastUse: false }, 't')

    const db = this.acquire()
    return db
      .all<unknown[], SelectItem>(statement, query?.toPlainParams(['types']))
      .then((rows) => {
        rows.forEach((selectItem) => {
          if (NotNullish(selectItem.extraData)) {
            try {
              selectItem.extraData = JSON.parse(selectItem.extraData as string)
            } catch (error) {
              LogUtil.error(`解析查询配置项${selectItem.label}的额外数据失败，error`, error)
            }
            if (NotNullish(selectItem.extraData)) {
              const extra = selectItem.extraData as { type: SearchType; id: number }
              const subLabels: string[] = []
              switch (extra.type) {
                case SearchType.LOCAL_TAG:
                  subLabels.push(...['tag', 'local'])
                  break
                case SearchType.SITE_TAG: {
                  const localTag = (extra as { type: SearchType; id: number; localTag: string }).localTag
                  const site = new Site((extra as { type: SearchType; id: number; site: Site }).site)
                  selectItem.extraData = { type: extra.type, id: extra.id, localTag: localTag, site: site }
                  subLabels.push(...['tag', IsNullish(site.siteName) ? '?' : site.siteName])
                  break
                }
                case SearchType.LOCAL_AUTHOR:
                  subLabels.push(...['author', 'local'])
                  break
                case SearchType.SITE_AUTHOR: {
                  const localAuthor = (extra as { type: SearchType; id: number; localAuthor: string }).localAuthor
                  const site = new Site((extra as { type: SearchType; id: number; site: Site }).site)
                  selectItem.extraData = { type: extra.type, id: extra.id, localAuthor: localAuthor, site: site }
                  subLabels.push(...['author', IsNullish(site.siteName) ? '?' : site.siteName])
                  break
                }
                default:
                  LogUtil.error(
                    this.constructor.name,
                    `解析查询配置项${selectItem.label}的额外数据失败，出现了意外的类型，type: ${extra.type}`
                  )
              }
              selectItem.subLabels = subLabels
            } else {
              LogUtil.error(this.constructor.name, `解析查询配置项${selectItem.label}的额外数据失败，额外数据意外为空`)
            }
          }
        })
        const resultPage = page.copy<SearchTypes, SelectItem>()
        resultPage.data = rows
        return resultPage
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
