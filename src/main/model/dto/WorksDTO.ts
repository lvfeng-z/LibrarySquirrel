import Works from '../Works.ts'
import LocalAuthor from '../LocalAuthor.ts'
import SiteTag from '../SiteTag.ts'

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
   * 作品资源的数据流
   */
  resourceBuffer: Buffer | undefined | null

  constructor(works?: WorksDTO) {
    if (works === undefined) {
      super()
      this.author = undefined
      this.siteTags = undefined
      this.resourceBuffer = undefined
    } else {
      super(works)
      if (typeof works.author === 'string') {
        this.author = JSON.parse(works.author)
      } else {
        this.author = works.author
      }
      this.siteTags = works.siteTags
      this.resourceBuffer = works.resourceBuffer
    }
  }
}
