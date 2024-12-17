import BaseQueryDTO from '../model/queryDTO/BaseQueryDTO.js'
import BaseEntity from '../model/entity/BaseEntity.js'
import DB from '../database/DB.js'
import CoreDao from './CoreDao.js'
import Page from '../model/util/Page.js'
import SearchConditionQueryDTO from '../model/queryDTO/SearchConditionQueryDTO.js'
import SelectItem from '../model/util/SelectItem.js'
import { SearchTypes } from '../constant/SearchType.js'
import { SearchType } from '../model/util/SearchCondition.js'
import { isNullish, notNullish } from '../util/CommonUtil.js'
import StringUtil from '../util/StringUtil.js'
import LogUtil from '../util/LogUtil.js'
import Site from '../model/entity/Site.js'

export default class SearchDao extends CoreDao<BaseQueryDTO, BaseEntity> {
  constructor(db?: DB) {
    super('SearchDao', db)
  }

  public async querySearchConditionPage(page: Page<SearchConditionQueryDTO, BaseEntity>): Promise<Page<SearchTypes, SelectItem>> {
    const query = page.query
    const statements: string[] = []
    const keyword = query?.keywordForFullMatch()
    const hasKeyword = StringUtil.isNotBlank(keyword)
    if (hasKeyword && notNullish(query)) {
      query.keyword = keyword
    }

    // 本地标签
    if (isNullish(query?.types) || query.types.includes(SearchType.LOCAL_TAG)) {
      statements.push(
        hasKeyword
          ? `SELECT id || 'localTag' AS value, local_tag_name AS label, last_use, '{ "type": "localTag" }' AS extraData FROM local_tag WHERE local_tag_name LIKE @keyword`
          : `SELECT id || 'localTag' AS value, local_tag_name AS label, last_use, '{ "type": "localTag" }' AS extraData FROM local_tag`
      )
    }

    // 站点标签
    if (isNullish(query?.types) || query.types.includes(SearchType.SITE_TAG)) {
      const statement =
        `SELECT t1.id || 'siteTag' AS value, t1.site_tag_name AS label, t1.last_use,
                  JSON_OBJECT(
                    'type', 'siteTag',
                    'localTag',
                    JSON_OBJECT('id', t2.id, 'localTagName', t2.local_tag_name, 'baseLocalTagId', t2.base_local_tag_id),
                    'site',
                    JSON_OBJECT('id', t3.id, 'siteName', t3.site_name, 'siteDomain', t3.site_domain, 'siteHomepage',
                                t3.site_domain)
                  ) AS extraData
        FROM site_tag t1
               LEFT JOIN local_tag t2 ON t1.local_tag_id = t2.id
               LEFT JOIN site t3 ON t1.site_id = t3.id` + (hasKeyword ? ` WHERE site_tag_name LIKE @keyword` : '')
      statements.push(statement)
    }

    // 本地作者
    if (isNullish(query?.types) || query.types.includes(SearchType.LOCAL_AUTHOR)) {
      statements.push(
        hasKeyword
          ? `SELECT id || 'localAuthor' AS value, local_author_name AS label, last_use, '{ "type": "localAuthor" }' AS extraData FROM local_author WHERE local_author_name LIKE @keyword`
          : `SELECT id || 'localAuthor' AS value, local_author_name AS label, last_use, '{ "type": "localAuthor" }' AS extraData FROM local_author`
      )
    }

    // 站点作者
    if (isNullish(query?.types) || query.types.includes(SearchType.SITE_AUTHOR)) {
      const statement =
        `SELECT t1.id || 'siteAuthor' AS value, t1.site_author_name AS label, t1.last_use,
                  JSON_OBJECT(
                    'type', 'siteTag',
                    'siteAuthor',
                    JSON_OBJECT('id', t2.id, 'siteAuthorName', t2.local_author_name),
                    'site',
                    JSON_OBJECT('id', t3.id, 'siteName', t3.site_name, 'siteDomain', t3.site_domain, 'siteHomepage',
                                t3.site_domain)
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
          if (notNullish(selectItem.extraData)) {
            const id = selectItem.value
            try {
              selectItem.extraData = JSON.parse(selectItem.extraData as string)
            } catch (error) {
              LogUtil.error(`解析查询配置项${selectItem.label}的额外数据失败，error`, error)
            }
            if (notNullish(selectItem.extraData)) {
              const extra = selectItem.extraData as { type: string }
              const subLabels: string[] = []
              switch (extra.type) {
                case 'localTag':
                  subLabels.push(...['tag', 'local'])
                  break
                case 'siteTag': {
                  const localTag = (extra as { type: string; localTag: string }).localTag
                  const site = new Site((extra as { type: string; site: Site }).site)
                  selectItem.extraData = { localTag: localTag, site: site }
                  subLabels.push(...['tag', isNullish(site.siteName) ? '?' : site.siteName])
                  break
                }
                case 'localAuthor':
                  subLabels.push(...['author', 'local'])
                  break
                case 'siteAuthor': {
                  const localAuthor = (extra as { type: string; localAuthor: string }).localAuthor
                  const site = new Site((extra as { type: string; site: Site }).site)
                  selectItem.extraData = { localAuthor: localAuthor, site: site }
                  subLabels.push(...['author', isNullish(site.siteName) ? '?' : site.siteName])
                  break
                }
                default:
                  LogUtil.error(this.className, `解析查询配置项${selectItem.label}的额外数据时，出现了意外的类型，type: ${extra.type}`)
              }
              selectItem.extraData['id'] = id
              selectItem.subLabels = subLabels
            } else {
              LogUtil.error(this.className, `解析查询配置项${selectItem.label}的额外数据失败，额外数据意外为空`)
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
