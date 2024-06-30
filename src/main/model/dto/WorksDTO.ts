import Works from '../Works.ts'
import Site from '../Site.ts'
import SiteTag from '../SiteTag.ts'
import LocalTag from '../LocalTag.ts'
import fs from 'fs'
import LocalAuthorDTO from './LocalAuthorDTO.ts'
import SiteAuthorDTO from './SiteAuthorDTO.ts'

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
  siteTags: SiteTag[] | undefined | null

  /**
   * 作品资源的数据流
   */
  resourceStream: fs.ReadStream | undefined | null

  /**
   * 作品资源的文件大小，单位：字节（Bytes）
   */
  resourceSize: number | undefined | null

  constructor(works?: WorksDTO) {
    if (works === undefined) {
      super()
      this.site = undefined
      this.localAuthors = undefined
      this.siteAuthors = undefined
      this.localTags = undefined
      this.siteTags = undefined
      this.resourceStream = undefined
      this.resourceSize = undefined
    } else {
      super(works)
      this.site = works.site
      this.localAuthors = works.localAuthors
      this.localTags = works.localTags
      this.siteAuthors = works.siteAuthors
      this.siteTags = works.siteTags
      this.resourceStream = works.resourceStream
      this.resourceSize = works.resourceSize
    }
  }
}
