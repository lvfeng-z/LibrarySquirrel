import { MeaningOfPath } from '@shared/model/util/MeaningOfPath.ts'
import { PluginManifest } from './PluginManifest.ts'
import { ContributionKey, ContributionMap } from './ContributionTypes.ts'
import WorkSet from '@shared/model/entity/WorkSet.ts'

/**
 * 插件上下文接口
 * 主程序提供给插件的 API 和工具
 */
export interface PluginContext {
  /** 插件清单 */
  manifest: PluginManifest
  /** 插件ID (数据库) */
  pluginId: number

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
    /** 日志工具 */
    logger: {
      info: (message: string, ...args: unknown[]) => void
      debug: (message: string, ...args: unknown[]) => void
      warn: (message: string, ...args: unknown[]) => void
      error: (message: string, ...args: unknown[]) => void
    }
  }

  /** 获取指定贡献点的服务提供者 */
  getContribution<K extends ContributionKey>(key: K): ContributionMap[K] | undefined
}
