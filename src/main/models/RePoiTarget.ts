/**
 * 兴趣点-目标关联表
 */
export default class RePoiTarget {
  id: string
  poi_id: number
  target_id: number
  target_type: string
  constructor(id: string, poi_id: number, target_id: number, target_type: string) {
    this.id = id
    this.poi_id = poi_id
    this.target_id = target_id
    this.target_type = target_type
  }
}
