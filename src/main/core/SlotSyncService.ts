import LogUtil from '../util/LogUtil.ts'
import { getMainWindow } from './mainWindow.ts'
import type { SlotConfig } from '../plugin/types/SlotTypes.ts'

/**
 * IPC 事件名称枚举
 */
export enum SlotEvent {
  /** 位点注册 */
  REGISTER = 'slot-register',
  /** 位点注销 */
  UNREGISTER = 'slot-unregister',
  /** 批量位点注册 */
  BATCH_REGISTER = 'slot-batch-register',
  /** 同步所有位点 */
  SYNC_ALL = 'slot-sync-all'
}

/** 内存中的位点注册表 */
const registeredSlots = new Map<string, SlotConfig>()

/**
 * 插件位点同步服务
 * 负责在主进程中管理位点注册，并将变更同步到渲染进程
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
   * 注册位点
   */
  registerSlot(config: SlotConfig): void {
    const slotId = config.id
    registeredSlots.set(slotId, config)
    this.syncToRenderer(SlotEvent.REGISTER, config)
    LogUtil.info('SlotSyncService', `注册位点: ${slotId}, 类型: ${config.type}`)
  }

  /**
   * 注销位点
   */
  unregisterSlot(slotId: string): void {
    if (registeredSlots.has(slotId)) {
      const config = registeredSlots.get(slotId)
      registeredSlots.delete(slotId)
      this.syncToRenderer(SlotEvent.UNREGISTER, { id: slotId, type: config?.type, pluginId: config?.pluginId })
      LogUtil.info('SlotSyncService', `注销位点: ${slotId}`)
    }
  }

  /**
   * 批量注册位点
   */
  registerSlots(configs: SlotConfig[]): void {
    configs.forEach((config) => registeredSlots.set(config.id, config))
    this.syncToRenderer(SlotEvent.BATCH_REGISTER, configs)
    LogUtil.info('SlotSyncService', `批量注册位点: ${configs.length}个`)
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
      LogUtil.error('SlotSyncService', '同步位点到渲染进程失败', error)
    }
  }

  /**
   * 获取所有已注册的位点 (用于渲染进程首次加载时同步)
   */
  getAllSlots(): SlotConfig[] {
    return Array.from(registeredSlots.values())
  }

  /**
   * 根据插件ID获取所有位点
   */
  getSlotsByPluginId(pluginId: number): SlotConfig[] {
    return Array.from(registeredSlots.values()).filter((slot) => slot.pluginId === pluginId)
  }

  /**
   * 注销插件的所有位点
   */
  unregisterSlotsByPluginId(pluginId: number): void {
    const slots = this.getSlotsByPluginId(pluginId)
    slots.forEach((slot) => this.unregisterSlot(slot.id))
  }
}

export const getSlotSyncService = () => SlotSyncService.getInstance()
export { SlotSyncService }
