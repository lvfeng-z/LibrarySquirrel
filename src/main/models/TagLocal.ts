/**
 * 本地标签
 */

export default class TagLocal {
  /**
   * 主键
   */
  id: number | null | undefined
  /**
   * 本地标签名称
   */
  localTagName: string | null | undefined
  /**
   * 上级标签id
   */
  baseLocalTagId: number | null | undefined
  constructor(tagLocal: TagLocal) {
    this.id = tagLocal.id
    this.localTagName = tagLocal.localTagName
    this.baseLocalTagId = tagLocal.baseLocalTagId
  }
}
