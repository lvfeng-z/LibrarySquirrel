import log from '../util/LogUtil.ts'
import { getMainWindow } from './mainWindow.ts'
import { SlotConfig } from '@shared/model/constant/SlotTypes.ts'
import { getVueSourceCompiler } from '../service/VueSourceCompiler.ts'
import path from 'path'
import { RootDir } from '../util/FileSysUtil.ts'

/**
 * IPC 事件名称枚举
 */
export enum SlotEvent {
  /** 插槽注册 */
  REGISTER = 'slot-register',
  /** 插槽注销 */
  UNREGISTER = 'slot-unregister',
  /** 批量插槽注册 */
  BATCH_REGISTER = 'slot-batch-register',
  /** 同步所有插槽 */
  SYNC_ALL = 'slot-sync-all'
}

/** 内存中的插槽注册表 */
const registeredSlots = new Map<string, SlotConfig>()

/**
 * 插件插槽同步服务
 * 负责在主进程中管理插槽注册，并将变更同步到渲染进程
 */
class SlotSyncService {
  private static instance: SlotSyncService

  private constructor() {
    /* empty */
  }

  static getInstance(): SlotSyncService {
    if (!SlotSyncService.instance) {
      SlotSyncService.instance = new SlotSyncService()
    }
    return SlotSyncService.instance
  }

  /**
   * 注册插槽
   */
  async registerSlot(config: SlotConfig): Promise<void> {
    const slotId = config.slotId

    // 检测 vueSource 类型并自动编译
    if ('contentType' in config && config.contentType === 'vueSource') {
      const content = config.content
      if (typeof content === 'string') {
        try {
          log.info('SlotSyncService', `检测到 vueSource 类型插槽，开始编译: ${slotId}`)
          const compiler = getVueSourceCompiler()
          const finalContent = path.join(RootDir(), content)

          // 更新配置，添加编译结果路径
          config.content = await compiler.compile(finalContent, config.pluginPublicId, slotId)

          log.info('SlotSyncService', `Vue 源码编译完成: ${slotId}`)
        } catch (error) {
          log.error('SlotSyncService', `Vue 源码编译失败: ${slotId}`, error)
          throw error
        }
      } else {
        log.warn('SlotSyncService', `vueSource 类型的内容需要是字符串路径: ${slotId}`)
      }
    }

    registeredSlots.set(slotId, config)
    this.syncToRenderer(SlotEvent.REGISTER, config)
    log.info('SlotSyncService', `注册插槽: ${slotId}, 类型: ${config.type}`)
  }

  /**
   * 注销插槽
   */
  unregisterSlot(slotId: string): void {
    if (registeredSlots.has(slotId)) {
      const config = registeredSlots.get(slotId)
      registeredSlots.delete(slotId)
      this.syncToRenderer(SlotEvent.UNREGISTER, { id: slotId, type: config?.type, pluginId: config?.pluginId })
      log.info('SlotSyncService', `注销插槽: ${slotId}`)
    }
  }

  /**
   * 批量注册插槽
   */
  async registerSlots(configs: SlotConfig[]): Promise<void> {
    for (const config of configs) {
      const slotId = config.slotId

      // 检测 vueSource 类型并自动编译
      if ('contentType' in config && config.contentType === 'vueSource') {
        const content = config.content
        if (typeof content === 'string') {
          try {
            log.info('SlotSyncService', `检测到 vueSource 类型插槽，开始编译: ${slotId}`)
            const compiler = getVueSourceCompiler()
            const result = await compiler.compile(content, config.pluginPublicId, slotId)

            // 更新配置，添加编译结果路径
            config['compiledJsPath'] = result.js
            config['compiledCssPath'] = result.css

            log.info('SlotSyncService', `Vue 源码编译完成: ${slotId}`)
          } catch (error) {
            log.error('SlotSyncService', `Vue 源码编译失败: ${slotId}`, error)
            throw error
          }
        } else {
          log.warn('SlotSyncService', `vueSource 类型的内容需要是字符串路径: ${slotId}`)
        }
      }

      registeredSlots.set(config.slotId, config)
    }
    this.syncToRenderer(SlotEvent.BATCH_REGISTER, configs)
    log.info('SlotSyncService', `批量注册插槽: ${configs.length}个`)
  }

  /**
   * 同步到渲染进程
   */
  private syncToRenderer(event: SlotEvent, data: unknown): void {
    try {
      const mainWindow = getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(event, data)
      }
    } catch (error) {
      log.error('SlotSyncService', '同步插槽到渲染进程失败', error)
    }
  }

  /**
   * 获取所有已注册的插槽 (用于渲染进程首次加载时同步)
   */
  getAllSlots(): SlotConfig[] {
    return Array.from(registeredSlots.values())
  }

  /**
   * 根据插件ID获取所有插槽
   */
  getSlotsByPluginId(pluginPublicId: string): SlotConfig[] {
    return Array.from(registeredSlots.values()).filter((slot) => slot.pluginPublicId === pluginPublicId)
  }

  /**
   * 注销插件的所有插槽
   */
  unregisterSlotsByPluginId(pluginPublicId: string): void {
    const slots = this.getSlotsByPluginId(pluginPublicId)
    slots.forEach((slot) => this.unregisterSlot(slot.pluginPublicId))
  }
}

export const getSlotSyncService = () => SlotSyncService.getInstance()
export { SlotSyncService }
