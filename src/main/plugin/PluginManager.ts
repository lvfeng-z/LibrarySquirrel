import log from '../util/LogUtil.ts'
import Electron from 'electron'
import { MeaningOfPath } from '@shared/model/util/MeaningOfPath.ts'
import LocalAuthorService from '../service/LocalAuthorService.ts'
import LocalTagService from '../service/LocalTagService.ts'
import SiteService from '../service/SiteService.ts'
import { isNullish, notNullish } from '@shared/util/CommonUtil.ts'
import { PathTypeEnum } from '../constant/PathTypeEnum.ts'
import PluginService from '../service/PluginService.ts'
import Plugin from '@shared/model/entity/Plugin.ts'
import WorkSetService from '../service/WorkSetService.ts'
import SecureStorageService from '../service/SecureStorageService.ts'
import { getMainWindow } from '../core/mainWindow.ts'
import { getPluginTaskUrlListenerManager } from '../core/pluginTaskUrlListener.ts'
import { getSiteBrowserManager } from '../core/siteBrowserManager.ts'
import { getSlotSyncService } from '../core/SlotSyncService.ts'
import { ContributionKey, ContributionMap } from './types/ContributionTypes.ts'
import { PluginContext } from './types/PluginContext.ts'
import { PluginEntryPoint, PluginInstance } from './types/PluginInstance.ts'
import { ActivationType } from './types/ActivationTypes.ts'
import { GetContributionOptions } from './types/ContributionFilePathInfo.ts'
import { assertNotBlank, assertNotNullish } from '@shared/util/AssertUtil.ts'
import PluginQueryDTO from '@shared/model/queryDTO/PluginQueryDTO.ts'
import Site from '@shared/model/entity/Site.ts'
import SiteBrowserDTO from '@shared/model/dto/SiteBrowserDTO.ts'
import { RootDir } from '../util/FileSysUtil.ts'
import path from 'path'
import { pathToFileURL } from 'node:url'
import PluginWithContribution from '@shared/model/domain/PluginWithContribution.ts'
import { InstallType } from '@shared/model/interface/PluginInstallType.ts'
import TaskService from '../service/TaskService.ts'
import TaskCreateResponse from '@shared/model/util/TaskCreateResponse.ts'
import {
  EmbedSlotConfig,
  MenuSlotConfig,
  PanelSlotConfig,
  SiteBrowserListSlotConfig,
  ViewSlotConfig
} from '@shared/model/interface/SlotConfigs.ts'
import { SlotConfig } from '@shared/model/constant/SlotTypes.ts'
import { BOOL } from '@shared/model/constant/BOOL.ts'
import { isBlank } from '@shared/util/StringUtil.ts'

/**
 * 缓存的插件实例
 */
interface CachedPlugin {
  instance: PluginInstance | undefined
  context: PluginContext
  loaded: Promise<PluginInstance>
  activationType?: ActivationType
  justInstalled: boolean
}

/**
 * 插件加载器
 * 支持多贡献点、单入口文件加载
 */
export default class PluginManager {
  /**
   * 插件缓存
   * @private
   */
  private readonly pluginCache: Map<string, CachedPlugin> = new Map()

  /**
   * 插件服务
   */
  private readonly pluginService: PluginService

  /**
   * 主窗口对象
   */
  private readonly mainWindow: Electron.BrowserWindow

  constructor(pluginService?: PluginService) {
    this.pluginService = pluginService ?? new PluginService()
    this.mainWindow = getMainWindow()
  }

  /**
   * 加载插件
   * @param pluginPublicId 插件ID
   * @param justInstalled
   * @returns 插件实例
   */
  public async load(pluginPublicId: string, justInstalled?: boolean): Promise<PluginInstance> {
    let cached = this.pluginCache.get(pluginPublicId)

    if (isNullish(cached)) {
      const plugin = await this.pluginService.getByPublicId(pluginPublicId)
      assertNotBlank(plugin?.entryPath, '')
      assertNotNullish(plugin, '加载插件失败，插件id不可用')
      const context = await this.createPluginContext(pluginPublicId)

      const loaded = this.loadPluginInstance(plugin, context)

      cached = {
        instance: undefined,
        context,
        loaded,
        justInstalled: isNullish(justInstalled) ? false : justInstalled
      }

      this.pluginCache.set(pluginPublicId, cached)

      // 等待插件加载完成
      const instance = await loaded
      cached.instance = instance

      // 调用激活函数
      if (instance.activate) {
        await instance.activate()
      }

      return instance
    }

    return cached.loaded
  }

  /**
   * 加载插件实例
   * @param plugin 插件
   * @param context 插件上下文
   * @returns 插件实例
   * @private
   */
  private async loadPluginInstance(plugin: Plugin, context: PluginContext): Promise<PluginInstance> {
    const entryPath = plugin.entryPath
    if (isBlank(entryPath)) {
      throw new Error(`插件加载路径不能为空，pluginId: ${plugin.id}`)
    }
    const moduleUrl = pathToFileURL(entryPath).href
    const module = await import(moduleUrl)
    const entryPoint: PluginEntryPoint = module.default

    if (typeof entryPoint !== 'function') {
      throw new Error(`插件入口点必须是函数，但获取到了 ${typeof entryPoint}`)
    }

    return entryPoint(context)
  }

  /**
   * 获取指定贡献点
   * @param pluginPublicId 插件ID
   * @param key 贡献点键名
   * @param contributionId 贡献点id
   * @returns 贡献点实现
   */
  public async getContribution<K extends ContributionKey>(
    pluginPublicId: string,
    key: K,
    contributionId: string
  ): Promise<ContributionMap[K]>
  /**
   * 获取指定贡献点的文件路径信息（用于子线程加载）
   * @param pluginPublicId 插件ID
   * @param key 贡献点键名
   * @param contributionId 贡献点id
   * @param options 选项
   * @param options.returnFilePath 是否返回文件路径信息
   * @returns 贡献点文件路径
   */
  public async getContribution<K extends ContributionKey>(
    pluginPublicId: string,
    key: K,
    contributionId: string,
    options: GetContributionOptions
  ): Promise<string>
  /**
   * 获取指定贡献点实现
   */
  public async getContribution<K extends ContributionKey>(
    pluginPublicId: string,
    key: K,
    contributionId: string,
    options?: GetContributionOptions
  ): Promise<ContributionMap[K] | string> {
    const pluginInstance = await this.load(pluginPublicId)
    const contribution = await pluginInstance.getContribution(key, contributionId, options)

    if (isNullish(contribution)) {
      throw new Error(`插件 ${pluginPublicId} 未实现 ${key} 贡献点`)
    }

    return contribution as ContributionMap[K] | string
  }

  /**
   * 创建插件上下文
   * @private
   */
  private async createPluginContext(pluginPublicId: string): Promise<PluginContext> {
    const plugin = await this.pluginService.getByPublicId(pluginPublicId)
    assertNotNullish(plugin, `创建插件上下文失败，插件不存在，插件公开id${pluginPublicId}`)
    const pluginId = plugin.id
    assertNotNullish(pluginId, '创建插件上下文失败，插件id不能为空')
    const secureStorageService = new SecureStorageService()
    const pluginService = this.pluginService
    const pluginName = plugin?.name ?? ''

    const logger = {
      info: (...args: unknown[]) => log.info(`Plugin[${pluginName}]`, ...args),
      debug: (...args: unknown[]) => log.debug(`Plugin[${pluginName}]`, ...args),
      warn: (...args: unknown[]) => log.warn(`Plugin[${pluginName}]`, ...args),
      error: (...args: unknown[]) => log.error(`Plugin[${pluginName}]`, ...args)
    }

    return {
      app: {
        getMainWindow: () => getMainWindow(),
        createWindow: (options) => new Electron.BrowserWindow(options),
        explainPath: (dir) => this.requestExplainPath(dir),
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

  /**
   * 请求用户解释目录含义
   * @param dir 目录
   * @private
   */
  private requestExplainPath(dir: string): Promise<MeaningOfPath[]> {
    return new Promise((resolve, reject) => {
      // 监听渲染进程的explain-path-response事件
      Electron.ipcMain.once('explain-path-response', async (_event, meaningOfPaths: MeaningOfPath[]) => {
        for (const meaningOfPath of meaningOfPaths) {
          if (meaningOfPath.type === PathTypeEnum.AUTHOR) {
            const localAuthorService = new LocalAuthorService()
            if (notNullish(meaningOfPath.id)) {
              const localAuthor = await localAuthorService.getById(meaningOfPath.id)
              if (isNullish(localAuthor)) {
                const msg = '附加目录含义中的作者信息失败，作者id不可用'
                log.error(this.constructor.name, msg)
                reject(msg)
              } else {
                meaningOfPath.name = localAuthor.authorName
                meaningOfPath.details = localAuthor
              }
            }
          }
          if (meaningOfPath.type === PathTypeEnum.TAG) {
            const localTagService = new LocalTagService()
            if (notNullish(meaningOfPath.id)) {
              const localTag = await localTagService.getById(meaningOfPath.id)
              if (isNullish(localTag)) {
                const msg = '附加目录含义中的标签信息失败，标签id不可用'
                log.error(this.constructor.name, msg)
                reject(msg)
              } else {
                meaningOfPath.name = localTag.localTagName
                meaningOfPath.details = localTag
              }
            }
          }
          if (meaningOfPath.type === PathTypeEnum.SITE) {
            const siteService = new SiteService()
            if (notNullish(meaningOfPath.id)) {
              const site = await siteService.getById(meaningOfPath.id)
              if (isNullish(site)) {
                const msg = '附加目录含义中的站点信息失败，站点id不可用'
                log.error(this.constructor.name, msg)
                reject(msg)
              } else {
                meaningOfPath.name = site.siteName
                meaningOfPath.details = site
              }
            }
          }
        }
        resolve(meaningOfPaths)
      })
      // 向渲染进程发送explain-path-request事件
      this.mainWindow.webContents.send('explain-path-request', dir)
    })
  }

  // ==================== 插件激活管理 ====================

  /**
   * 根据激活类型激活插件
   * @param pluginPublicId 插件ID
   * @param installType 安装类型
   */
  public async onInstallPlugin(pluginPublicId: string, installType: InstallType): Promise<void> {
    // 替换已有缓存
    this.pluginCache.delete(pluginPublicId)
    const pluginInstance = await this.load(pluginPublicId, true)
    // 调用安装后钩子
    return pluginInstance.onInstall(installType)
  }

  /**
   * 根据激活类型激活插件
   * @param pluginPublicId 插件ID
   * @param activationType 激活类型
   */
  public async activatePlugin(pluginPublicId: string, activationType: ActivationType): Promise<void> {
    // 如果已经激活，直接返回
    const cached = this.pluginCache.get(pluginPublicId)
    if (cached?.activationType) {
      log.debug('PluginManager', `插件 ${pluginPublicId} 已激活，跳过`)
      return
    }

    await this.load(pluginPublicId)
    // 设置激活类型
    const pluginCached = this.pluginCache.get(pluginPublicId)
    if (notNullish(pluginCached)) {
      pluginCached.activationType = activationType
    }
  }

  /**
   * 停用插件
   * @param pluginPublicId 插件ID
   */
  public async deactivatePlugin(pluginPublicId: string): Promise<void> {
    const cached = this.pluginCache.get(pluginPublicId)
    if (!cached?.activationType) {
      log.debug('PluginManager', `插件 ${pluginPublicId} 未激活，无需停用`)
      return
    }

    log.info('PluginManager', `停用插件 ${pluginPublicId}`)

    try {
      // 获取插件实例并调用 deactivate 方法
      const instance = await this.load(pluginPublicId)
      if (instance.deactivate) {
        await instance.deactivate()
      }
    } catch (error) {
      log.error('PluginManager', `插件 ${pluginPublicId} 停用失败`, error)
    } finally {
      // 清除激活类型
      cached.activationType = undefined
      // 注销插件贡献的所有插槽
      getSlotSyncService().unregisterSlotsByPluginId(pluginPublicId)
    }
  }

  /**
   * 激活所有启动时加载的插件
   */
  public async activateStartupPlugins(): Promise<void> {
    log.info('PluginManager', '开始激活启动时加载的插件')

    // 获取所有已安装且未卸载的插件
    const query = new PluginQueryDTO()
    query.activationType = ActivationType.STARTUP
    query.uninstalled = BOOL.FALSE
    const plugins = await this.pluginService.list(query)
    if (!plugins || plugins.length === 0) {
      log.info('PluginManager', '没有需要加载的插件')
      return
    }

    for (const plugin of plugins) {
      // 跳过没有有效 id 的插件
      if (isNullish(plugin.publicId)) {
        continue
      }
      try {
        assertNotBlank(plugin.publicId, '插件公开id不能为空')
        await this.activatePlugin(plugin.publicId, ActivationType.STARTUP)
        log.info('PluginManager', `插件 ${plugin.name} 激活成功`)
      } catch (error) {
        log.error('PluginManager', `插件 ${plugin.name} 激活失败`, error)
        throw error
      }
    }

    log.info('PluginManager', '启动时插件激活完成')
  }

  /**
   * 获取插件激活类型
   * @param pluginPublicId 插件ID
   */
  public getActivationType(pluginPublicId: string): ActivationType | undefined {
    return this.pluginCache.get(pluginPublicId)?.activationType
  }

  /**
   * 检查插件是否已激活
   * @param pluginPublicId 插件ID
   */
  public isActivated(pluginPublicId: string): boolean {
    return !!this.pluginCache.get(pluginPublicId)?.activationType
  }
}
