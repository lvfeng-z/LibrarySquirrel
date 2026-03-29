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
import log from '../../util/LogUtil.ts'
import { getSlotSyncService } from '../../core/SlotSyncService.ts'
import PluginService from '../../service/PluginService.ts'
import { assertNotNullish } from '@shared/util/AssertUtil.ts'
import SecureStorageService from '../../service/SecureStorageService.ts'
import Plugin from '@shared/model/entity/Plugin.ts'
import WorkSetService from '../../service/WorkSetService.ts'
import { getPluginTaskUrlListenerManager } from '../../core/pluginTaskUrlListener.ts'
import PluginWithContribution from '@shared/model/domain/PluginWithContribution.ts'
import SiteService from '../../service/SiteService.ts'
import { getSiteBrowserManager } from '../../core/siteBrowserManager.ts'
import TaskService from '../../service/TaskService.ts'
import path from 'node:path'
import { RootDir } from '../../util/FileSysUtil.ts'

/**
 * 插件上下文接口
 * 主程序提供给插件的 API 和工具
 */
export interface PluginContext {
  /** 主程序API */
  app: {
    // /** 获取主窗口 */
    // getMainWindow: () => Electron.BrowserWindow
    /** 创建新窗口 */
    createWindow: (options: Electron.BrowserWindowConstructorOptions) => Electron.BrowserWindow
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
    getPluginRoot: (isRelative: boolean) => string
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

/**
 * 创建插件上下文
 * @private
 */
export async function createPluginContext(pluginPublicId: string): Promise<PluginContext> {
  const pluginService = new PluginService()
  const plugin = await pluginService.getByPublicId(pluginPublicId)
  assertNotNullish(plugin, `创建插件上下文失败，插件不存在，插件公开id${pluginPublicId}`)
  const pluginId = plugin.id
  assertNotNullish(pluginId, '创建插件上下文失败，插件id不能为空')
  const secureStorageService = new SecureStorageService()
  const pluginName = plugin?.name ?? ''

  const logger = {
    info: (...args: unknown[]) => log.info(`Plugin[${pluginName}]`, ...args),
    debug: (...args: unknown[]) => log.debug(`Plugin[${pluginName}]`, ...args),
    warn: (...args: unknown[]) => log.warn(`Plugin[${pluginName}]`, ...args),
    error: (...args: unknown[]) => log.error(`Plugin[${pluginName}]`, ...args)
  }

  return {
    app: {
      createWindow: (options) => new Electron.BrowserWindow(options),
      getPluginData: async () => plugin?.pluginData ?? undefined,
      setPluginData: async (data) => {
        const tempPlugin = new Plugin()
        tempPlugin.id = plugin.id
        tempPlugin.pluginData = data
        return pluginService.updateById(tempPlugin)
      },
      storeEncryptedValue: (plainValue, description) => secureStorageService.storeAndGetKey(plainValue, description),
      getDecryptedValue: (storageKey) => secureStorageService.getValueByKey(storageKey),
      removeEncryptedValue: (storageKey) => secureStorageService.removeByKey(storageKey),
      getWorkSetBySiteWorkSetId: (siteWorkSetId, siteName) =>
        new WorkSetService().getBySiteWorkSetIdAndSiteName(siteWorkSetId, siteName),
      registerUrlListener: (conditions: { contributionId: string; listenerPatterns: RegExp[] }[]) => {
        const listenerManager = getPluginTaskUrlListenerManager()
        for (const condition of conditions) {
          const pluginWithContribution = new PluginWithContribution(plugin, 'taskHandler', condition.contributionId)
          listenerManager.register(pluginWithContribution, condition.listenerPatterns)
        }
      },
      unregisterUrlListener: () => {
        const listenerManager = getPluginTaskUrlListenerManager()
        listenerManager.unregister(pluginPublicId)
      },
      addSite: async (site: Site[]) => {
        const siteService = new SiteService()
        return siteService.saveBatchIfNotExist(site)
      },
      registerSiteBrowser: (siteBrowser: SiteBrowserDTO) => {
        const manager = getSiteBrowserManager()
        siteBrowser = new SiteBrowserDTO(siteBrowser)
        manager.register(siteBrowser)
      },
      unregisterSiteBrowser: (contributionId: string) => {
        const manager = getSiteBrowserManager()
        manager.unregister(contributionId)
      },
      createTask: async (url: string): Promise<TaskCreateResponse> => {
        const taskService = new TaskService()
        return taskService.createTask(url)
      },
      getPluginRoot: (isRelative: boolean) => {
        if (isRelative) {
          // 返回相对于根目录的路径
          return plugin?.rootPath as string
        } else {
          return path.join(RootDir(), plugin?.rootPath as string)
        }
      },
      logger
    },
    pluginData: plugin.pluginData,
    slots: {
      registerEmbedSlot: (config: Omit<EmbedSlotConfig, 'pluginPublicId' | 'type'>) => {
        const fullConfig: EmbedSlotConfig = { ...config, pluginId, pluginPublicId, type: 'embed' }
        getSlotSyncService().registerSlot(fullConfig)
      },
      registerPanelSlot: (config: Omit<PanelSlotConfig, 'pluginPublicId' | 'type'>) => {
        const fullConfig: PanelSlotConfig = { ...config, pluginId, pluginPublicId, type: 'panel' }
        getSlotSyncService().registerSlot(fullConfig)
      },
      registerViewSlot: (config: Omit<ViewSlotConfig, 'pluginPublicId' | 'type'>) => {
        const fullConfig: ViewSlotConfig = { ...config, pluginId, pluginPublicId, type: 'view' }
        getSlotSyncService().registerSlot(fullConfig)
      },
      registerMenuSlot: (config: Omit<MenuSlotConfig, 'pluginPublicId' | 'type'>) => {
        const fullConfig: MenuSlotConfig = { ...config, pluginId, pluginPublicId, type: 'menu' }
        getSlotSyncService().registerSlot(fullConfig)
      },
      registerSiteBrowserSlot: (config: Omit<SiteBrowserListSlotConfig, 'pluginPublicId' | 'type'>) => {
        const fullConfig: SiteBrowserListSlotConfig = { ...config, pluginId, pluginPublicId, type: 'siteBrowserList' }
        getSlotSyncService().registerSlot(fullConfig)
      },
      unregisterSlot: (slotId: string) => {
        getSlotSyncService().unregisterSlot(slotId)
      },
      registerSlots: (configs: SlotConfig[]) => {
        getSlotSyncService().registerSlots(configs)
      }
    }
  }
}
