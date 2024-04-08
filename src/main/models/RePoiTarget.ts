/**
 * 兴趣点-目标关联表
 */
export default class RePoiTarget {
  id: string
  poiId: number
  targetId: number
  targetType: string
  constructor(id: string, poiId: number, targetId: number, targetType: string) {
    this.id = id
    this.poiId = poiId
    this.targetId = targetId
    this.targetType = targetType
  }
}
