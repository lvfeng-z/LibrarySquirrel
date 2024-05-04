/**
 * 本地标签
 */
import BaseModel from './BaseModel'

export default class LocalTag extends BaseModel{
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
