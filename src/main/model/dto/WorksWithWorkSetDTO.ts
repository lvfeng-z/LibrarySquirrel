import Work from '../entity/Work.ts'
import WorksSet from '../entity/WorksSet.ts'

/**
 * 作品与作品集DTO
 */
export default class WorksWithWorkSetDTO {
  /**
   * 作品
   */
  works: Work

  /**
   * 作品集
   */
  worksSet: WorksSet

  constructor(works: Work, worksSet: WorksSet) {
    this.works = works
    this.worksSet = worksSet
  }
}
