import BaseModel from './BaseModel.ts'

/**
 * 兴趣点
 */
export default class Poi extends BaseModel {
  /**
   * 主键
   */
  id: string | undefined | null
  /**
   * 兴趣点名称
   */
  poiName: string | undefined | null
  constructor(poi: Poi) {
    super(poi)
    this.id = poi.id
    this.poiName = poi.poiName
  }
}
