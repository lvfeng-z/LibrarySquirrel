import SiteBrowserDTO from '@shared/model/dto/SiteBrowserDTO.ts'
import Page from '@shared/model/util/Page.ts'
import { PageUtil } from '@shared/util/PageUtil.ts'

/**
 * 站点浏览器管理器
 * 负责管理所有插件注册的站点浏览器
 */
export default class SiteBrowserManager {
  /**
   * 站点浏览器缓存
   * @private
   */
  private readonly siteBrowserCache: Map<string, SiteBrowserDTO> = new Map()

  /**
   * 注册站点浏览器
   * @param siteBrowser 站点浏览器信息
   */
  public register(siteBrowser: SiteBrowserDTO): void {
    this.siteBrowserCache.set(siteBrowser.pluginPublicId, siteBrowser)
  }

  /**
   * 注销站点浏览器
   * @param siteBrowserId 站点浏览器 ID
   */
  public unregister(siteBrowserId: string): void {
    this.siteBrowserCache.delete(siteBrowserId)
  }

  /**
   * 获取所有站点浏览器
   * @returns 站点浏览器列表
   */
  public list(): SiteBrowserDTO[] {
    return Array.from(this.siteBrowserCache.values())
  }

  /**
   * 根据 ID 获取站点浏览器
   * @param id 站点浏览器 ID
   * @returns 站点浏览器信息
   */
  public getById(id: string): SiteBrowserDTO | undefined {
    return this.siteBrowserCache.get(id)
  }

  /**
   * 根据插件 ID 获取站点浏览器
   * @param pluginId 插件 ID
   * @returns 站点浏览器信息
   */
  public getByPluginId(pluginId: number): SiteBrowserDTO | undefined {
    for (const siteBrowser of this.siteBrowserCache.values()) {
      if (siteBrowser.pluginId === pluginId) {
        return siteBrowser
      }
    }
    return undefined
  }

  /**
   * 清空所有站点浏览器
   */
  public clear(): void {
    this.siteBrowserCache.clear()
  }

  /**
   * 分页查询站点浏览器
   * @param page 分页参数
   * @returns 分页结果
   */
  public queryPage(page: Page<object, SiteBrowserDTO>): Page<object, SiteBrowserDTO> {
    const allData = this.list()
    return PageUtil.paginateWithPage(allData, page)
  }
}
