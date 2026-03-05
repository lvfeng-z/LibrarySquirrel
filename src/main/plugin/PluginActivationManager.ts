import { ActivationType } from './types/ActivationTypes.ts'
import PluginService from '../service/PluginService.ts'
import LogUtil from '../util/LogUtil.ts'
import PluginLoader from './PluginLoader.ts'
import PluginQueryDTO from '@shared/model/queryDTO/PluginQueryDTO.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'
import { isBlank } from '@shared/util/StringUtil.ts'

/**
 * 插件激活管理器
 * 负责根据激活类型管理插件的加载和卸载
 */
export class PluginActivationManager {
  /**
   * 插件服务
   */
  private readonly pluginService: PluginService

  /**
   * 插件加载器
   */
  private readonly pluginLoader: PluginLoader

  /**
   * 激活队列 - 记录已激活的插件
   */
  private readonly activatedPlugins: Map<number, ActivationType> = new Map()

  constructor(pluginService?: PluginService, pluginLoader?: PluginLoader) {
    this.pluginService = pluginService ?? new PluginService()
    this.pluginLoader = pluginLoader ?? new PluginLoader(this.pluginService)
  }

  /**
   * 根据激活类型激活插件
   * @param pluginId 插件ID
   * @param activationType 激活类型
   * @param pluginName 插件名称
   */
  public async activatePlugin(pluginId: number, activationType: ActivationType, pluginName?: string): Promise<void> {
    // 如果已经激活，直接返回
    if (this.activatedPlugins.has(pluginId)) {
      LogUtil.debug('PluginActivationManager', `插件 ${pluginId} 已激活，跳过`)
      return
    }
    const finalName = isBlank(pluginName) ? pluginId : pluginName

    try {
      await this.pluginLoader.load(pluginId)
      this.activatedPlugins.set(pluginId, activationType)
      LogUtil.info('PluginActivationManager', `插件 ${finalName} 激活成功`)
    } catch (error) {
      LogUtil.error('PluginActivationManager', `插件 ${finalName} 激活失败`, error)
      throw error
    }
  }

  /**
   * 停用插件
   * @param pluginId 插件ID
   */
  public async deactivatePlugin(pluginId: number): Promise<void> {
    if (!this.activatedPlugins.has(pluginId)) {
      LogUtil.debug('PluginActivationManager', `插件 ${pluginId} 未激活，无需停用`)
      return
    }

    LogUtil.info('PluginActivationManager', `停用插件 ${pluginId}`)

    try {
      // 获取插件实例并调用 deactivate 方法
      const instance = await this.pluginLoader.load(pluginId)
      if (instance.deactivate) {
        await instance.deactivate()
      }
    } catch (error) {
      LogUtil.error('PluginActivationManager', `插件 ${pluginId} 停用失败`, error)
    } finally {
      this.activatedPlugins.delete(pluginId)
    }
  }

  /**
   * 激活所有启动时加载的插件
   */
  public async activateStartupPlugins(): Promise<void> {
    LogUtil.info('PluginActivationManager', '开始激活启动时加载的插件')

    // 获取所有已安装且未卸载的插件
    const query = new PluginQueryDTO()
    query.activationType = ActivationType.STARTUP
    const plugins = await this.pluginService.list(query)
    if (!plugins || plugins.length === 0) {
      LogUtil.info('PluginActivationManager', '没有需要加载的插件')
      return
    }

    for (const plugin of plugins) {
      // 跳过没有有效 id 的插件
      if (!plugin.id) {
        continue
      }
      try {
        await this.activatePlugin(plugin.id, ActivationType.STARTUP, isNullish(plugin.name) ? undefined : plugin.name)
      } catch (ignored) {}
    }

    LogUtil.info('PluginActivationManager', '启动时插件激活完成')
  }

  /**
   * 获取插件激活类型
   * @param pluginId 插件ID
   */
  public getActivationType(pluginId: number): ActivationType | undefined {
    return this.activatedPlugins.get(pluginId)
  }

  /**
   * 检查插件是否已激活
   * @param pluginId 插件ID
   */
  public isActivated(pluginId: number): boolean {
    return this.activatedPlugins.has(pluginId)
  }
}
