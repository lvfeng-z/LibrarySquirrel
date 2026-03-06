/**
 * 站点浏览器 DTO
 */
export default class SiteBrowserDTO {
  /** 插件公开 ID */
  pluginPublicId: string
  /** 名称 */
  name: string
  /** 图片路径 */
  imagePath: string
  /** 插件 ID */
  pluginId: number

  constructor(data?: Partial<SiteBrowserDTO>) {
    this.pluginPublicId = data?.pluginPublicId ?? ''
    this.name = data?.name ?? ''
    this.imagePath = data?.imagePath ?? ''
    this.pluginId = data?.pluginId ?? 0
  }
}
