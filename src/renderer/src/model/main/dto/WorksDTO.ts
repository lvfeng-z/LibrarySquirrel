import Works from '../Works.ts'
import LocalAuthor from '../LocalAuthor.ts'

/**
 * 作品
 */
export default class WorksDTO extends Works {
  /**
   * 作者
   */
  localAuthor: LocalAuthor | undefined | null

  constructor(works?: WorksDTO) {
    if (works === undefined) {
      super()
      this.localAuthor = undefined
    } else {
      super(works)
      if (typeof works.localAuthor === 'string') {
        this.localAuthor = JSON.parse(works.localAuthor)
      } else {
        this.localAuthor = works.localAuthor
      }
    }
  }
}
