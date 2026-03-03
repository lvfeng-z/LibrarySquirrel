import LogUtil from '../util/LogUtil.ts'
import Electron from 'electron'
import { MeaningOfPath } from '@shared/model/util/MeaningOfPath.ts'
import LocalAuthorService from '../service/LocalAuthorService.ts'
import LocalTagService from '../service/LocalTagService.ts'
import SiteService from '../service/SiteService.ts'
import { IsNullish, NotNullish } from '@shared/util/CommonUtil.ts'
import { PathTypeEnum } from '../constant/PathTypeEnum.ts'
import PluginService from '../service/PluginService.ts'
import Plugin from '@shared/model/entity/Plugin.ts'
import WorkSetService from '../service/WorkSetService.ts'
import SecureStorageService from '../service/SecureStorageService.ts'
import { getMainWindow } from '../core/mainWindow.ts'
import { getPluginTaskUrlListenerManager } from '../core/pluginTaskUrlListener.ts'
import { GetBrowserWindow } from '../util/MainWindowUtil.js'
import { ContributionKey, ContributionMap, TaskContribution } from './types/ContributionTypes.ts'
import { PluginManifest } from './types/PluginManifest.ts'
import { PluginContext } from './types/PluginContext.ts'
import { PluginInstance, PluginEntryPoint } from './types/PluginInstance.ts'
import PluginLoadDTO from '@shared/model/dto/PluginLoadDTO.ts'
import { AssertNotNullish } from '@shared/util/AssertUtil.ts'

/**
 * 缓存的插件实例
 */
interface CachedPlugin {
  instance: PluginInstance
  context: PluginContext
  loaded: Promise<PluginInstance>
}

/**
 * 插件加载器
 * 支持多贡献点、单入口文件加载
 */
export default class PluginLoader {
  /**
   * 插件缓存
   * @private
   */
  private readonly pluginCache: Map<number, CachedPlugin> = new Map()

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
   * @param pluginId 插件ID
   * @returns 插件实例
   */
  public async load(pluginId: number): Promise<PluginInstance> {
    let cached = this.pluginCache.get(pluginId)

    if (IsNullish(cached)) {
      const pluginLoadDTO = await this.pluginService.getDTOById(pluginId)
      const context = await this.createPluginContext(pluginId, pluginLoadDTO)

      const loaded = this.loadPluginInstance(pluginLoadDTO, context)

      cached = {
        instance: {} as PluginInstance,
        context,
        loaded
      }

      this.pluginCache.set(pluginId, cached)

      // 等待插件加载完成
      const instance = await loaded
      cached.instance = instance

      // 调用激活函数
      if (instance.activate) {
        await instance.activate(context)
      }

      return instance
    }

    return cached.loaded
  }

  /**
   * 加载插件实例
   * @param pluginLoadDTO 插件加载DTO
   * @param context 插件上下文
   * @returns 插件实例
   * @private
   */
  private async loadPluginInstance(pluginLoadDTO: PluginLoadDTO, context: PluginContext): Promise<PluginInstance> {
    const loadPath = pluginLoadDTO.loadPath
    if (!loadPath) {
      throw new Error(`插件加载路径不能为空，pluginId: ${pluginLoadDTO.id}`)
    }
    const module = await import(loadPath)
    const entryPoint: PluginEntryPoint = module.default

    if (typeof entryPoint !== 'function') {
      throw new Error(`插件入口点必须是函数，但获取到了 ${typeof entryPoint}`)
    }

    const instance = await entryPoint(context)

    // 验证实现的贡献点
    this.validateContributions(instance)

    // 将 pluginId 设置到 implementations 中
    if (instance.implementations.task) {
      const taskContribution = instance.implementations.task as TaskContribution
      taskContribution.pluginId = context.pluginId
      taskContribution.context = context
    }

    return instance
  }

  /**
   * 获取指定贡献点
   * @param pluginId 插件ID
   * @param key 贡献点键名
   * @returns 贡献点实现
   */
  public async getContribution<K extends ContributionKey>(pluginId: number, key: K): Promise<ContributionMap[K]> {
    const pluginInstance = await this.load(pluginId)
    const contribution = await pluginInstance.getContribution(key)

    if (IsNullish(contribution)) {
      throw new Error(`插件 ${pluginId} 未实现 ${key} 贡献点`)
    }

    return contribution as ContributionMap[K]
  }

  /**
   * 创建插件上下文
   * @private
   */
  private async createPluginContext(pluginId: number, pluginLoadDTO: PluginLoadDTO): Promise<PluginContext> {
    const plugin = await this.pluginService.getById(pluginId)
    AssertNotNullish(plugin, this.constructor.name, '创建插件上下文失败，插件id不可用')
    const secureStorageService = new SecureStorageService()
    const pluginService = this.pluginService
    const pluginName = plugin?.name ?? ''
    const pluginAuthor = plugin?.author ?? ''

    const logger = {
      info: (...args: unknown[]) => LogUtil.info(`Plugin[${pluginAuthor}-${pluginName}]`, ...args),
      debug: (...args: unknown[]) => LogUtil.debug(`Plugin[${pluginAuthor}-${pluginName}]`, ...args),
      warn: (...args: unknown[]) => LogUtil.warn(`Plugin[${pluginAuthor}-${pluginName}]`, ...args),
      error: (...args: unknown[]) => LogUtil.error(`Plugin[${pluginAuthor}-${pluginName}]`, ...args)
    }

    return {
      manifest: this.buildManifest(plugin, pluginLoadDTO),
      pluginId,
      app: {
        getMainWindow: () => getMainWindow(),
        createWindow: (options) => new Electron.BrowserWindow(options),
        explainPath: (dir) => this.requestExplainPath(dir),
        getPluginData: async () => plugin?.pluginData ?? undefined,
        setPluginData: async (data) => {
          const tempPlugin = new Plugin()
          tempPlugin.id = pluginId
          tempPlugin.pluginData = data
          return pluginService.updateById(tempPlugin)
        },
        storeEncryptedValue: (plainValue, description) => secureStorageService.storeAndGetKey(plainValue, description),
        getDecryptedValue: (storageKey) => secureStorageService.getValueByKey(storageKey),
        removeEncryptedValue: (storageKey) => secureStorageService.removeByKey(storageKey),
        getWorkSetBySiteWorkSetId: (siteWorkSetId, siteName) =>
          new WorkSetService().getBySiteWorkSetIdAndSiteName(siteWorkSetId, siteName),
        getBrowserWindow: (width?: number, height?: number) => GetBrowserWindow(width, height),
        registerUrlListener: (listenerPatterns: string[]) => {
          const listenerManager = getPluginTaskUrlListenerManager()
          listenerManager.register(plugin, listenerPatterns)
        },
        unregisterUrlListener: () => {
          const listenerManager = getPluginTaskUrlListenerManager()
          listenerManager.unregister(pluginId)
        },
        logger
      }
    }
  }

  /**
   * 构建插件清单
   * @private
   */
  private buildManifest(plugin: Plugin | undefined, _pluginLoadDTO: PluginLoadDTO): PluginManifest {
    return {
      id: `${plugin?.author}/${plugin?.name}`,
      name: plugin?.name ?? '',
      version: plugin?.version ?? '',
      author: plugin?.author ?? '',
      description: plugin?.description ?? undefined,
      contributes: [],
      entryFile: plugin?.fileName ?? ''
    }
  }

  /**
   * 验证贡献点实现
   * @private
   */
  private validateContributions(instance: PluginInstance): void {
    if (!instance.implementations || Object.keys(instance.implementations).length === 0) {
      throw new Error('插件必须实现至少一个贡献点')
    }

    // 验证task贡献点
    if (instance.implementations.task) {
      const task = instance.implementations.task
      const requiredMethods = ['create', 'createWorkInfo', 'start', 'retry', 'pause', 'stop', 'resume']

      for (const method of requiredMethods) {
        if (typeof (task as unknown as Record<string, unknown>)[method] !== 'function') {
          throw new Error(`task贡献点缺少方法: ${method}`)
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
            if (NotNullish(meaningOfPath.id)) {
              const localAuthor = await localAuthorService.getById(meaningOfPath.id)
              if (IsNullish(localAuthor)) {
                const msg = '附加目录含义中的作者信息失败，作者id不可用'
                LogUtil.error('PluginLoader', msg)
                reject(msg)
              } else {
                meaningOfPath.name = localAuthor.authorName
                meaningOfPath.details = localAuthor
              }
            }
          }
          if (meaningOfPath.type === PathTypeEnum.TAG) {
            const localTagService = new LocalTagService()
            if (NotNullish(meaningOfPath.id)) {
              const localTag = await localTagService.getById(meaningOfPath.id)
              if (IsNullish(localTag)) {
                const msg = '附加目录含义中的标签信息失败，标签id不可用'
                LogUtil.error('PluginLoader', msg)
                reject(msg)
              } else {
                meaningOfPath.name = localTag.localTagName
                meaningOfPath.details = localTag
              }
            }
          }
          if (meaningOfPath.type === PathTypeEnum.SITE) {
            const siteService = new SiteService()
            if (NotNullish(meaningOfPath.id)) {
              const site = await siteService.getById(meaningOfPath.id)
              if (IsNullish(site)) {
                const msg = '附加目录含义中的站点信息失败，站点id不可用'
                LogUtil.error('PluginLoader', msg)
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
}
