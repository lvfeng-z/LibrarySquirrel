import TaskPluginListener from '../model/entity/TaskPluginListener.ts'
import TaskPluginListenerDao from '../dao/TaskPluginListenerDao.ts'
import BaseService from './BaseService.ts'
import TaskPluginListenerQueryDTO from '../model/queryDTO/TaskPluginListenerQueryDTO.ts'
import DB from '../database/DB.ts'
import Plugin from '../model/entity/Plugin.js'

/**
 * 任务插件监听器Service
 */
export default class TaskPluginListenerService extends BaseService<
  TaskPluginListenerQueryDTO,
  TaskPluginListener,
  TaskPluginListenerDao
> {
  constructor(db?: DB) {
    super(TaskPluginListenerDao, db)
  }

  saveBatch(entities: TaskPluginListener[]) {
    return this.dao.saveBatch(entities)
  }

  /**
   * 获取监听此链接的插件
   */
  listListener(url: string): Promise<Plugin[]> {
    return this.dao.listListener(url)
  }
}
