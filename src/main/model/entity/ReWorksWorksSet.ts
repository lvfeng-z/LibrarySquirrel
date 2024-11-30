import BaseEntity from './BaseEntity.ts'

/**
 * 作品-作品集关联表
 */
export default class ReWorksWorksSet extends BaseEntity {
  /**
   * 主键
   */
  id: number | undefined | null
  /**
   * 作品id
   */
  worksId: number | undefined | null
  /**
   * 作品集id
   */
  worksSetId: number | undefined | null

  constructor(reWorksWorksSet?: ReWorksWorksSet) {
    if (reWorksWorksSet === undefined) {
      super()
      this.id = undefined
      this.worksId = undefined
      this.worksSetId = undefined
    } else {
      super(reWorksWorksSet)
      this.id = reWorksWorksSet.id
      this.worksId = reWorksWorksSet.worksId
      this.worksSetId = reWorksWorksSet.worksSetId
    }
  }
}
