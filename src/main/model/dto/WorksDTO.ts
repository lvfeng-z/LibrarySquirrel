import Works from '../Works.ts'
import LocalAuthor from '../LocalAuthor.ts'
import SiteAuthor from '../SiteAuthor.ts'
import SiteTag from '../SiteTag.ts'
import fs from 'fs'

/**
 * 作品
 */
export default class WorksDTO extends Works {
  /**
   * 本地作者
   */
  localAuthor: LocalAuthor | undefined | null

  /**
   * 站点作者
   */
  siteAuthor: SiteAuthor | undefined | null

  /**
   * 站点标签数组
   */
  siteTags: SiteTag[] | undefined | null

  /**
   * 作品资源的文件流
   */
  resourceStream: fs.ReadStream | undefined | null

  /**
   * 作品资源的文件大小，单位：字节（Bytes）
   */
  resourceSize: number | undefined | null

  constructor(works?: WorksDTO) {
    if (works === undefined) {
      super()
      this.localAuthor = undefined
      this.siteAuthor = undefined
      this.siteTags = undefined
      this.resourceStream = undefined
      this.resourceSize = undefined
    } else {
      super(works)
      if (typeof works.localAuthor === 'string') {
        this.localAuthor = JSON.parse(works.localAuthor)
      } else {
        this.localAuthor = works.localAuthor
      }
      if (typeof works.siteAuthor === 'string') {
        this.siteAuthor = JSON.parse(works.siteAuthor)
      } else {
        this.siteAuthor = works.siteAuthor
      }
      this.siteTags = works.siteTags
      this.resourceStream = works.resourceStream
      this.resourceSize = works.resourceSize
    }
  }
}
