/**
 * 本地标签
 */

export default class TagLocal {
  id: number
  localTagName: string
  baseLocalTagId: number
  constructor(id: number, localTagName: string, baseLocalTagId: number) {
    this.id = id
    this.localTagName = localTagName
    this.baseLocalTagId = baseLocalTagId
  }
}
