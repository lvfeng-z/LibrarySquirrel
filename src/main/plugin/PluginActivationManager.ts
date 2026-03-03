import { ActivationType } from './types/ActivationTypes.ts'
import PluginService from '../service/PluginService.ts'
import LogUtil from '../util/LogUtil.ts'
import PluginLoader from './PluginLoader.ts'
import PluginQueryDTO from '@shared/model/queryDTO/PluginQueryDTO.ts'
import { PluginContext } from './types/PluginContext.ts'

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
   */
  public async activatePlugin(pluginId: number, activationType: ActivationType): Promise<void> {
    // 如果已经激活，直接返回
    if (this.activatedPlugins.has(pluginId)) {
      LogUtil.debug('PluginActivationManager', `插件 ${pluginId} 已激活，跳过`)
      return
    }

    switch (activationType) {
      case ActivationType.STARTUP:
        await this.activateStartup(pluginId)
        break
      case ActivationType.LAZY:
        await this.activateLazy(pluginId)
        break
      case ActivationType.MANUAL:
        // 手动激活模式下，不自动加载，只记录状态
        this.activatedPlugins.set(pluginId, activationType)
        LogUtil.info('PluginActivationManager', `插件 ${pluginId} 标记为手动激活模式`)
        break
    }
  }

  /**
   * 启动时激活插件
   * @param pluginId 插件ID
   * @private
   */
  private async activateStartup(pluginId: number): Promise<void> {
    LogUtil.info('PluginActivationManager', `启动时激活插件 ${pluginId}`)
    try {
      await this.pluginLoader.load(pluginId)
      this.activatedPlugins.set(pluginId, ActivationType.STARTUP)
      LogUtil.info('PluginActivationManager', `插件 ${pluginId} 启动激活成功`)
    } catch (error) {
      LogUtil.error('PluginActivationManager', `插件 ${pluginId} 启动激活失败`, error)
      throw error
    }
  }

  /**
   * 按需激活插件
   * 首次使用时触发加载
   * @param pluginId 插件ID
   * @private
   */
  private async activateLazy(pluginId: number): Promise<void> {
    LogUtil.info('PluginActivationManager', `按需激活插件 ${pluginId}`)
    try {
      await this.pluginLoader.load(pluginId)
      this.activatedPlugins.set(pluginId, ActivationType.LAZY)
      LogUtil.info('PluginActivationManager', `插件 ${pluginId} 按需激活成功`)
    } catch (error) {
      LogUtil.error('PluginActivationManager', `插件 ${pluginId} 按需激活失败`, error)
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
        const context = await this.createPluginContext(pluginId)
        await instance.deactivate(context)
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

    // 获取所有已安装的插件
    const plugins = await this.pluginService.list({} as PluginQueryDTO)
    if (!plugins || plugins.length === 0) {
      LogUtil.info('PluginActivationManager', '没有已安装的插件')
      return
    }

    for (const plugin of plugins) {
      // 跳过没有有效 id 的插件
      if (!plugin.id) {
        continue
      }
      // TODO: 从插件清单读取激活类型，暂时默认 LAZY
      // 后续需要从 plugin.pluginData 或其他配置中读取
      const activationType = ActivationType.LAZY
      await this.activatePlugin(plugin.id, activationType)
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

  /**
   * 创建插件上下文（用于 deactivate）
   * @param pluginId 插件ID
   * @private
   */
  private async createPluginContext(_pluginId: number): Promise<PluginContext> {
    // 这里需要创建完整的 PluginContext，但由于 deactivate 只需要基本功能
    // 可以简化处理 - 返回一个空对象
    // TODO: 实现完整的上下文创建
    return {} as PluginContext
  }
}
