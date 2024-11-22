import Works from '../entity/Works.ts'
import Site from '../entity/Site.ts'
import LocalTag from '../entity/LocalTag.ts'
import LocalAuthorDTO from './LocalAuthorDTO.ts'
import SiteAuthorDTO from './SiteAuthorDTO.ts'
import SiteTagDTO from '../dto/SiteTagDTO.ts'
import WorksSet from '../entity/WorksSet.ts'
import { Readable } from 'node:stream'
import { isNullish } from '../../../utils/CommonUtil'

/**
 * 作品
 */
export default class WorksDTO extends Works {
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

  /**
   * 作品资源的数据流
   */
  resourceStream: Readable | undefined | null

  /**
   * 作品资源的文件大小，单位：字节（Bytes）
   */
  resourceSize: number | undefined | null

  constructor(works?: WorksDTO | Works) {
    if (isNullish(works)) {
      super()
      this.site = undefined
      this.localAuthors = undefined
      this.siteAuthors = undefined
      this.localTags = undefined
      this.siteTags = undefined
      this.worksSets = undefined
      this.resourceStream = undefined
      this.resourceSize = undefined
    } else if (works instanceof WorksDTO) {
      super(works)
      this.site = works.site
      this.localAuthors = works.localAuthors
      this.localTags = works.localTags
      this.siteAuthors = works.siteAuthors
      this.siteTags = works.siteTags
      this.worksSets = works.worksSets
      this.resourceStream = works.resourceStream
      this.resourceSize = works.resourceSize
    } else {
      super(works)
      this.site = undefined
      this.localAuthors = undefined
      this.siteAuthors = undefined
      this.localTags = undefined
      this.siteTags = undefined
      this.worksSets = undefined
      this.resourceStream = undefined
      this.resourceSize = undefined
    }
  }
}
