import Work from '../entity/Work.ts'

/**
 * 作品+作品集id
 */
export default class WorkWithWorkSetId extends Work {
  /**
   * 作品集id
   */
  workSetId: number | undefined | null
}
