/**
 * 本地标签
 */

export default interface LocalTag {
  /**
   * 主键
   */
  id: number | null | undefined

  /**
   * 创建时间
   */
  createTime: string | null | undefined

  /**
   * 更新时间
   */
  updateTime: string | null | undefined

  /**
   * 本地标签名称
   */
  localTagName: string | null | undefined

  /**
   * 上级标签id
   */
  baseLocalTagId: number | null | undefined
}
