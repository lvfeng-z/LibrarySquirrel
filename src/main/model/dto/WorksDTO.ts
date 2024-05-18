import Works from '../Works'
import LocalAuthor from '../LocalAuthor'

/**
 * 作品
 */
export default class WorksDTO extends Works {
  /**
   * 作者
   */
  author: LocalAuthor | undefined | null

  constructor(works?: WorksDTO) {
    if (works === undefined) {
      super()
      this.author = undefined
    } else {
      super(works)
      if (typeof works.author === 'string') {
        this.author = JSON.parse(works.author)
      } else {
        this.author = works.author
      }
    }
  }
}
