import Works from '../entity/Works.ts'
import Site from '../entity/Site.ts'
import LocalTag from '../entity/LocalTag.ts'
import LocalAuthorDTO from './LocalAuthorDTO.ts'
import SiteAuthorPluginDTO from './SiteAuthorPluginDTO.js'
import SiteTagDTO from './SiteTagDTO.ts'
import WorksSet from '../entity/WorksSet.ts'
import { Readable } from 'node:stream'

/**
 * 作品
 */
export default class WorksPluginDTO extends Works {
  /**
   * 主键
   */
  id: number | undefined | null
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
  siteAuthors: SiteAuthorPluginDTO[] | undefined | null

  /**
   * 站点标签数组
   */
  siteTags: SiteTagDTO[] | undefined | null

  /**
   * 作品所属作品集
   */
  worksSets: WorksSet[] | undefined | null

  /**
   * 作品资源的数据流
   */
  resourceStream: Readable | undefined | null

  /**
   * 作品资源的文件大小，单位：字节（Bytes）
   */
  resourceSize: number

  /**
   * 资源是否支持续传
   */
  continuable: boolean | undefined | null

  /**
   * 是否更新作品数据
   */
  doUpdate: boolean

  constructor(works?: WorksPluginDTO) {
    if (works === undefined) {
      super()
      this.id = undefined
      this.site = undefined
      this.localAuthors = undefined
      this.siteAuthors = undefined
      this.localTags = undefined
      this.siteTags = undefined
      this.worksSets = undefined
      this.resourceStream = undefined
      this.resourceSize = 0
      this.continuable = undefined
      this.doUpdate = false
    } else {
      super(works)
      this.id = works.id
      this.site = works.site
      this.localAuthors = works.localAuthors
      this.localTags = works.localTags
      this.siteAuthors = works.siteAuthors
      this.siteTags = works.siteTags
      this.worksSets = works.worksSets
      this.resourceStream = works.resourceStream
      this.resourceSize = works.resourceSize
      this.continuable = works.continuable
      this.doUpdate = works.doUpdate
    }
  }
}
