import BaseModel from './BaseModel'

/**
 * 本地标签
 */
export default class LocalTag extends BaseModel {
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
  constructor(localTag: LocalTag) {
    super(localTag)
    this.id = localTag.id
    this.localTagName = localTag.localTagName
    this.baseLocalTagId = localTag.baseLocalTagId
  }
}
