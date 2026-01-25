import Work from '../entity/Work.ts'
import Site from '../entity/Site.ts'
import LocalTag from '../entity/LocalTag.ts'
import RankedLocalAuthor from '../domain/RankedLocalAuthor.ts'
import RankedSiteAuthor from '../domain/RankedSiteAuthor.ts'
import SiteTagFullDTO from './SiteTagFullDTO.ts'
import WorkSet from '../entity/WorkSet.ts'
import Resource from '../entity/Resource.js'
import lodash from 'lodash'

/**
 * 作品
 */
export default class WorkFullDTO extends Work {
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
  localAuthors: RankedLocalAuthor[] | undefined | null

  /**
   * 本地标签数组
   */
  localTags: LocalTag[] | undefined | null

  /**
   * 站点作者
   */
  siteAuthors: RankedSiteAuthor[] | undefined | null

  /**
   * 站点标签数组
   */
  siteTags: SiteTagFullDTO[] | undefined | null

  /**
   * 作品所属作品集
   */
  workSets: WorkSet[] | undefined | null

  constructor(work?: Work) {
    super(work)
    lodash.assign(
      this,
      lodash.pick(work, [
        'resource',
        'inactiveResource',
        'site',
        'localAuthors',
        'localTags',
        'siteAuthors',
        'siteTags',
        'workSets',
        'resourceStream',
        'resourceSize'
      ])
    )
  }
}
