/**
 * 站点浏览器 DTO
 */
export default class SiteBrowserDTO {
  /** 站点浏览器 ID（在插件内的唯一标识） */
  siteBrowserId: string
  /** 插件公开 ID */
  pluginPublicId: string
  /** 名称 */
  name: string
  /** 图片路径 */
  imagePath: string
  /** 插件 ID */
  pluginId: number

  constructor(data?: Partial<SiteBrowserDTO>) {
    this.siteBrowserId = data?.siteBrowserId ?? ''
    this.pluginPublicId = data?.pluginPublicId ?? ''
    this.name = data?.name ?? ''
    this.imagePath = data?.imagePath ?? ''
    this.pluginId = data?.pluginId ?? 0
  }

  /**
   * 获取完整 ID（pluginPublicId + "-" + siteBrowserId）
   */
  get id(): string {
    return `${this.pluginPublicId}-${this.siteBrowserId}`
  }
}
