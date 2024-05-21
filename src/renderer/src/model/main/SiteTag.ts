/**
 * 本地标签
 */

export default interface LocalTag {
  /**
   * 主键
   */
  id: number | undefined | null
  /**
   * 创建时间
   */
  createTime: number | null | undefined

  /**
   * 更新时间
   */
  updateTime: number | null | undefined
  /**
   * 标签来源站点id
   */
  siteId: number | undefined | null
  /**
   * 站点中标签的id
   */
  siteTagId: string | undefined | null
  /**
   * 站点中标签的名称
   */
  siteTagName: string | undefined | null
  /**
   * 上级标签id
   */
  baseSiteTagId: string | undefined | null
  /**
   * 描述
   */
  description: string | undefined | null
  /**
   * 站点标签对应的本地标签id
   */
  localTagId: number | undefined | null
}
