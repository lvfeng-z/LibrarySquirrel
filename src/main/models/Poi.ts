/**
 * 兴趣点
 */

export default class Poi {
  id: string
  poiName: string //兴趣点名称
  constructor(id: string, poiName: string) {
    this.id = id
    this.poiName = poiName
  }
}
