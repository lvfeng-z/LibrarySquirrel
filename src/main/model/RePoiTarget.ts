/**
 * 兴趣点-目标关联表
 */
export default class RePoiTarget {
  /**
   * 主键
   */
  id: string | undefined | null
  /**
   * 兴趣点id
   */
  poiId: number | undefined | null
  /**
   * 目标id
   */
  targetId: number | undefined | null
  /**
   * 目标类型
   */
  targetType: string | undefined | null
  constructor(rePoiTarget: RePoiTarget) {
    this.id = rePoiTarget.id
    this.poiId = rePoiTarget.poiId
    this.targetId = rePoiTarget.targetId
    this.targetType = rePoiTarget.targetType
  }
}