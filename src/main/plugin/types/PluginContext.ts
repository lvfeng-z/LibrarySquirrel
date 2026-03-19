import { MeaningOfPath } from '@shared/model/util/MeaningOfPath.ts'
import WorkSet from '@shared/model/entity/WorkSet.ts'
import Site from '@shared/model/entity/Site.ts'
import SiteBrowserDTO from '@shared/model/dto/SiteBrowserDTO.ts'
import TaskCreateResponse from '@shared/model/util/TaskCreateResponse.ts'
import {
  EmbedSlotConfig,
  MenuSlotConfig,
  PanelSlotConfig,
  SiteBrowserListSlotConfig,
  ViewSlotConfig
} from '@shared/model/interface/SlotConfigs.ts'
import { SlotConfig } from '@shared/model/constant/SlotTypes.ts'

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
    /** 注册任务URL监听器 */
    registerUrlListener: (conditions: { contributionId: string; listenerPatterns: RegExp[] }[]) => void
    /** 取消注册任务URL监听器 */
    unregisterUrlListener: () => void
    /** 保存站点 */
    addSite: (site: Site[]) => Promise<number>
    /** 注册站点浏览器 */
    registerSiteBrowser: (siteBrowser: SiteBrowserDTO) => void
    /** 取消注册站点浏览器 */
    unregisterSiteBrowser: (contributionId: string) => void
    /** 创建任务 */
    createTask: (url: string) => Promise<TaskCreateResponse>
    /** 获取插件根目录 */
    getPluginRoot: () => string
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

  /** 插槽注册 API - 允许插件贡献 UI 元素 */
  slots: {
    /** 注册嵌入插槽 (对应 EmbedSlot) */
    registerEmbedSlot: (config: Omit<EmbedSlotConfig, 'pluginPublicId' | 'type'>) => void
    /** 注册面板插槽 (对应 PanelSlot) */
    registerPanelSlot: (config: Omit<PanelSlotConfig, 'pluginPublicId' | 'type'>) => void
    /** 注册视图插槽 (对应 ViewSlot) */
    registerViewSlot: (config: Omit<ViewSlotConfig, 'pluginPublicId' | 'type'>) => void
    /** 注册菜单插槽 (对应 MenuSlot) */
    registerMenuSlot: (config: Omit<MenuSlotConfig, 'pluginPublicId' | 'type'>) => void
    /** 注册站点浏览器列表插槽 (对应 siteBrowserList) */
    registerSiteBrowserSlot: (config: Omit<SiteBrowserListSlotConfig, 'pluginPublicId' | 'type'>) => void
    /** 注销插槽 */
    unregisterSlot: (slotId: string) => void
    /** 批量注册插槽 */
    registerSlots: (configs: SlotConfig[]) => void
  }
}
