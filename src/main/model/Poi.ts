/**
 * 兴趣点
 */

export default class Poi {
  /**
   * 主键
   */
  id: string | undefined | null
  /**
   * 兴趣点名称
   */
  poiName: string | undefined | null
  constructor(poi: Poi) {
    this.id = poi.id
    this.poiName = poi.poiName
  }
}
