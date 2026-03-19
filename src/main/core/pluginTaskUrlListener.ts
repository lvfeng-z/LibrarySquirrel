import { isNullish } from '@shared/util/CommonUtil.ts'
import PluginWithContribution from '@shared/model/domain/PluginWithContribution.ts'

let pluginTaskUrlListenerManager: PluginTaskUrlListenerManager | undefined = undefined

function createPluginTaskUrlListenerManager() {
  if (isNullish(pluginTaskUrlListenerManager)) {
    pluginTaskUrlListenerManager = new PluginTaskUrlListenerManager()
  }
}

function getPluginTaskUrlListenerManager() {
  if (isNullish(pluginTaskUrlListenerManager)) {
    throw new Error('插件任务URL监听器管理器未初始化！')
  }
  return pluginTaskUrlListenerManager
}

class PluginTaskUrlListenerManager {
  /**
   * 监听器缓存
   * key: 正则表达式字符串
   * value: 插件对象列表
   */
  private readonly listeners: Map<RegExp, PluginWithContribution[]> = new Map()

  /**
   * 获取监听此链接的插件
   * @param url URL
   */
  async listListener(url: string): Promise<PluginWithContribution[]> {
    const result: PluginWithContribution[] = []

    for (const [pattern, plugins] of this.listeners) {
      try {
        const regex = new RegExp(pattern)
        if (regex.test(url)) {
          result.push(...plugins)
        }
      } catch {
        // 正则表达式无效，跳过
      }
    }

    return result
  }

  /**
   * 注册插件的任务URL监听器
   * @param plugin 插件对象
   * @param listenerPatterns 监听表达式数组（正则表达式）
   */
  register(plugin: PluginWithContribution, listenerPatterns: RegExp[]): void {
    for (const pattern of listenerPatterns) {
      const plugins = this.listeners.get(pattern)
      if (isNullish(plugins)) {
        this.listeners.set(pattern, [plugin])
      } else {
        plugins.push(plugin)
      }
    }
  }

  /**
   * 取消注册插件的任务URL监听器
   * @param pluginPublicId 插件ID
   */
  unregister(pluginPublicId: string): void {
    for (const [, plugins] of this.listeners) {
      const index = plugins.findIndex((p) => p.publicId === pluginPublicId)
      if (index !== -1) {
        plugins.splice(index, 1)
      }
    }
    // 清理空列表
    for (const [pattern, plugins] of this.listeners) {
      if (plugins.length === 0) {
        this.listeners.delete(pattern)
      }
    }
  }
}

export { createPluginTaskUrlListenerManager, getPluginTaskUrlListenerManager }
