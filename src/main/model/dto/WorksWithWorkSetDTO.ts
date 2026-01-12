import Works from '../entity/Works.ts'
import WorksSet from '../entity/WorksSet.ts'

/**
 * 作品与作品集DTO
 */
export default class WorksWithWorkSetDTO {
  /**
   * 作品
   */
  works: Works

  /**
   * 作品集
   */
  worksSet: WorksSet

  constructor(works: Works, worksSet: WorksSet) {
    this.works = works
    this.worksSet = worksSet
  }
}
