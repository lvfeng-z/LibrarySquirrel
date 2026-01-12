import Works from '../entity/Works.ts'

/**
 * 作品+作品集id
 */
export default class WorksWithWorksSetId extends Works {
  /**
   * 作品集id
   */
  worksSetId: number | undefined | null
}
