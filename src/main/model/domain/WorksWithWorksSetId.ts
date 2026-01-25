import Work from '../entity/Work.ts'

/**
 * 作品+作品集id
 */
export default class WorksWithWorksSetId extends Work {
  /**
   * 作品集id
   */
  worksSetId: number | undefined | null
}
