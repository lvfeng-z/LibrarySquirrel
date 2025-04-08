import Works from '../entity/Works.ts'
import Site from '../entity/Site.ts'
import LocalTag from '../entity/LocalTag.ts'
import LocalAuthorRoleDTO from './LocalAuthorRoleDTO.ts'
import SiteAuthorRoleDTO from './SiteAuthorRoleDTO.ts'
import SiteTagFullDTO from './SiteTagFullDTO.ts'
import WorksSet from '../entity/WorksSet.ts'
import Resource from '../entity/Resource.js'
import lodash from 'lodash'
import { NotNullish } from '../../util/CommonUtil.js'
import { ParsePropertyFromJson } from '../../util/ObjectUtil.js'

/**
 * 作品
 */
export default class WorksFullDTO extends Works {
  /**
   * 资源
   */
  resource: Resource | undefined | null

  /**
   * 不活跃的资源
   */
  inactiveResource: Resource[] | undefined | null

  /**
   * 站点
   */
  site: Site | undefined | null

  /**
   * 本地作者
   */
  localAuthors: LocalAuthorRoleDTO[] | undefined | null

  /**
   * 本地标签数组
   */
  localTags: LocalTag[] | undefined | null

  /**
   * 站点作者
   */
  siteAuthors: SiteAuthorRoleDTO[] | undefined | null

  /**
   * 站点标签数组
   */
  siteTags: SiteTagFullDTO[] | undefined | null

  /**
   * 作品所属作品集
   */
  worksSets: WorksSet[] | undefined | null

  constructor(works?: Works) {
    super(works)
    if (NotNullish(works)) {
      ParsePropertyFromJson(works, [
        {
          property: 'resource',
          builder: (src) => new Resource(src)
        },
        {
          property: 'inactiveResource',
          builder: (raw: []) => raw.map((rawResource) => new Resource(rawResource))
        },
        {
          property: 'site',
          builder: (src) => new Site(src)
        },
        {
          property: 'localAuthors',
          builder: (raw: []) => raw.map((rawLocalAuthor) => new LocalAuthorRoleDTO(rawLocalAuthor))
        },
        {
          property: 'localTags',
          builder: (raw: []) => raw.map((rawLocalTag) => new LocalTag(rawLocalTag))
        },
        {
          property: 'siteAuthors',
          builder: (raw: []) => raw.map((rawSiteAuthor) => new SiteAuthorRoleDTO(rawSiteAuthor))
        },
        {
          property: 'siteTags',
          builder: (raw: []) => raw.map((rawSiteTag) => new SiteTagFullDTO(rawSiteTag))
        },
        {
          property: 'worksSets',
          builder: (raw: []) => raw.map((rawWorksSet) => new WorksSet(rawWorksSet))
        }
      ])
      lodash.assign(
        this,
        lodash.pick(works, [
          'resource',
          'inactiveResource',
          'site',
          'localAuthors',
          'localTags',
          'siteAuthors',
          'siteTags',
          'worksSets',
          'resourceStream',
          'resourceSize'
        ])
      )
    }
  }
}
