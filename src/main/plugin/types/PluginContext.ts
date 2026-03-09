import { MeaningOfPath } from '@shared/model/util/MeaningOfPath.ts'
import WorkSet from '@shared/model/entity/WorkSet.ts'
import Site from '@shared/model/entity/Site.ts'
import SiteBrowserDTO from '@shared/model/dto/SiteBrowserDTO.ts'

/**
 * 插件上下文接口
 * 主程序提供给插件的 API 和工具
 */
export interface PluginContext {
  /** 主程序API */
  app: {
    /** 获取主窗口 */
    getMainWindow: () => Electron.BrowserWindow
    /** 创建新窗口 */
    createWindow: (options: Electron.BrowserWindowConstructorOptions) => Electron.BrowserWindow
    /** 路径解释 */
    explainPath: (dir: string) => Promise<MeaningOfPath[]>
    /** 获取插件数据 */
    getPluginData: () => Promise<string | undefined>
    /** 设置插件数据 */
    setPluginData: (data: string) => Promise<number>
    /** 加密存储 - 存储明文值并获取密文键 */
    storeEncryptedValue: (plainValue: string, description?: string) => Promise<string>
    /** 加密存储 - 根据密文键获取解密后的值 */
    getDecryptedValue: (storageKey: string) => Promise<string | undefined>
    /** 加密存储 - 删除密文存储 */
    removeEncryptedValue: (storageKey: string) => Promise<number>
    /** 根据作品集在站点的id和站点名称查询作品集 */
    getWorkSetBySiteWorkSetId: (siteWorkSetId: string, siteName: string) => Promise<WorkSet | undefined>
    /** 获取浏览器窗口 */
    getBrowserWindow: (width?: number, height?: number) => Electron.BrowserWindow
    /** 注册任务URL监听器 */
    registerUrlListener: (listenerPatterns: string[]) => void
    /** 取消注册任务URL监听器 */
    unregisterUrlListener: () => void
    /** 保存站点 */
    addSite: (site: Site[]) => Promise<number>
    /** 注册站点浏览器 */
    registerSiteBrowser: (siteBrowser: SiteBrowserDTO) => void
    /** 取消注册站点浏览器 */
    unregisterSiteBrowser: (siteBrowserId: string) => void
    /** 日志工具 */
    logger: {
      info: (message: string, ...args: unknown[]) => void
      debug: (message: string, ...args: unknown[]) => void
      warn: (message: string, ...args: unknown[]) => void
      error: (message: string, ...args: unknown[]) => void
    }
  }

  /** 插件数据 */
  pluginData: unknown
}
