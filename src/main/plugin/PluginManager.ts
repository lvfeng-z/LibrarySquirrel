import log from '../util/LogUtil.ts'
import { isNullish, notNullish } from '@shared/util/CommonUtil.ts'
import PluginService from '../service/PluginService.ts'
import Plugin from '@shared/model/entity/Plugin.ts'
import { getSlotSyncService } from '../core/SlotSyncService.ts'
import { ContributionKey, ContributionMap } from './types/ContributionTypes.ts'
import { createPluginContext, PluginContext } from './types/PluginContext.ts'
import { PluginEntryPoint, PluginInstance } from './types/PluginInstance.ts'
import { ActivationType } from './types/ActivationTypes.ts'
import { GetContributionOptions } from './types/ContributionFilePathInfo.ts'
import { assertNotBlank, assertNotNullish } from '@shared/util/AssertUtil.ts'
import PluginQueryDTO from '@shared/model/queryDTO/PluginQueryDTO.ts'
import { pathToFileURL } from 'node:url'
import { InstallType } from '@shared/model/interface/PluginInstallType.ts'
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

  constructor() {
    /* empty */
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
      const plugin = await new PluginService().getByPublicId(pluginPublicId)
      assertNotBlank(plugin?.entryPath, '')
      assertNotNullish(plugin, '加载插件失败，插件id不可用')
      const context = await createPluginContext(pluginPublicId)

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
    const plugins = await new PluginService().list(query)
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
