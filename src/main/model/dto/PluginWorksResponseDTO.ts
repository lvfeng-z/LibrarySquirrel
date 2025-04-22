import Works from '../entity/Works.ts'
import Site from '../entity/Site.ts'
import LocalTag from '../entity/LocalTag.ts'
import LocalAuthorRankDTO from './LocalAuthorRankDTO.ts'
import SiteAuthorPluginDTO from './SiteAuthorPluginDTO.js'
import WorksSet from '../entity/WorksSet.ts'
import { NotNullish } from '../../util/CommonUtil.js'
import ResourcePluginDTO from './ResourcePluginDTO.js'
import SiteTagPluginDTO from './SiteTagPluginDTO.js'

/**
 * 作品
 */
export default class PluginWorksResponseDTO {
  /**
   * 作品信息
   */
  works: Works

  /**
   * 站点
   */
  site: Site | undefined | null

  /**
   * 本地作者
   */
  localAuthors: LocalAuthorRankDTO[] | undefined | null

  /**
   * 本地标签数组
   */
  localTags: LocalTag[] | undefined | null

  /**
   * 站点作者
   */
  siteAuthors: SiteAuthorPluginDTO[] | undefined | null

  /**
   * 站点标签数组
   */
  siteTags: SiteTagPluginDTO[] | undefined | null

  /**
   * 作品所属作品集
   */
  worksSets: WorksSet[] | undefined | null

  /**
   * 是否更新作品数据
   */
  doUpdate: boolean | undefined | null

  /**
   * 资源
   */
  resource: ResourcePluginDTO | undefined | null

  constructor(works?: PluginWorksResponseDTO) {
    if (NotNullish(works)) {
      this.works = works.works
      this.site = works.site
      this.localAuthors = works.localAuthors
      this.localTags = works.localTags
      this.siteAuthors = works.siteAuthors
      this.siteTags = works.siteTags
      this.worksSets = works.worksSets
      this.doUpdate = works.doUpdate
      this.resource = works.resource
    } else {
      this.works = new Works()
    }
  }
}
