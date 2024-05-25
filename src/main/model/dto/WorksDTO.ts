import Works from '../Works.ts'
import LocalAuthor from '../LocalAuthor.ts'
import SiteTag from '../SiteTag.ts'
import fs from 'fs'

/**
 * 作品
 */
export default class WorksDTO extends Works {
  /**
   * 作者
   */
  author: LocalAuthor | undefined | null

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
      this.author = undefined
      this.siteTags = undefined
      this.resourceStream = undefined
      this.resourceSize = undefined
    } else {
      super(works)
      if (typeof works.author === 'string') {
        this.author = JSON.parse(works.author)
      } else {
        this.author = works.author
      }
      this.siteTags = works.siteTags
      this.resourceStream = works.resourceStream
      this.resourceSize = works.resourceSize
    }
  }
}
