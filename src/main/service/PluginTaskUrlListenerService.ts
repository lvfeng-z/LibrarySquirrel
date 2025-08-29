import PluginTaskUrlListener from '../model/entity/PluginTaskUrlListener.ts'
import PluginTaskUrlListenerDao from '../dao/PluginTaskUrlListenerDao.ts'
import BaseService from '../base/BaseService.ts'
import PluginTaskUrlListenerQueryDTO from '../model/queryDTO/PluginTaskUrlListenerQueryDTO.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import Plugin from '../model/entity/Plugin.js'

/**
 * 任务插件监听器Service
 */
export default class PluginTaskUrlListenerService extends BaseService<
  PluginTaskUrlListenerQueryDTO,
  PluginTaskUrlListener,
  PluginTaskUrlListenerDao
> {
  constructor(db?: DatabaseClient) {
    super(PluginTaskUrlListenerDao, db)
  }

  saveBatch(entities: PluginTaskUrlListener[]) {
    return this.dao.saveBatch(entities)
  }

  /**
   * 获取监听此链接的插件
   */
  listListener(url: string): Promise<Plugin[]> {
    return this.dao.listListener(url)
  }
}
