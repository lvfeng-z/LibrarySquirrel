/**
 * 本地标签
 */

export default class TagLocal {
  id: number | null | undefined
  localTagName: string | null | undefined
  baseLocalTagId: number | null | undefined
  constructor(id: number, localTagName: string, baseLocalTagId: number) {
    this.id = id
    this.localTagName = localTagName
    this.baseLocalTagId = baseLocalTagId
  }
}
