import Works from '../entity/Works.ts'
import Site from '../entity/Site.ts'
import LocalTag from '../entity/LocalTag.ts'
import LocalAuthorRoleDTO from '@renderer/model/main/dto/LocalAuthorRoleDTO.ts'
import SiteAuthorRoleDTO from '@renderer/model/main/dto/SiteAuthorRoleDTO.ts'
import SiteTagFullDTO from '@renderer/model/main/dto/SiteTagFullDTO.ts'
import WorksSet from '../entity/WorksSet.ts'
import Resource from '@renderer/model/main/entity/Resource.ts'
import lodash from 'lodash'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

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
