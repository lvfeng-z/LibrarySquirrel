import WorksSet from '../entity/WorksSet.ts'

/**
 * 作品集+作品id
 */
export default class WorksSetWithWorksId extends WorksSet {
  /**
   * 作品id
   */
  worksId: number | undefined | null
}
