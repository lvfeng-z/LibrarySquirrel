import Works from '../entity/Works.ts'
import Site from '../entity/Site.ts'
import LocalTag from '../entity/LocalTag.ts'
import LocalAuthorDTO from './LocalAuthorDTO.ts'
import SiteAuthorDTO from './SiteAuthorDTO.ts'
import SiteTagDTO from './SiteTagDTO.ts'
import WorksSet from '../entity/WorksSet.ts'
import Resource from '../entity/Resource.js'
import lodash from 'lodash'

/**
 * 作品
 */
export default class WorksDTO extends Works {
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
  localAuthors: LocalAuthorDTO[] | undefined | null

  /**
   * 本地标签数组
   */
  localTags: LocalTag[] | undefined | null

  /**
   * 站点作者
   */
  siteAuthors: SiteAuthorDTO[] | undefined | null

  /**
   * 站点标签数组
   */
  siteTags: SiteTagDTO[] | undefined | null

  /**
   * 作品所属作品集
   */
  worksSets: WorksSet[] | undefined | null

  constructor(works?: Works) {
    super(works)
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
