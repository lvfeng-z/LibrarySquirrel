import BaseDao from '../base/BaseDao.ts'
import PluginTaskUrlListener from '../model/entity/PluginTaskUrlListener.ts'
import PluginTaskUrlListenerQueryDTO from '../model/queryDTO/PluginTaskUrlListenerQueryDTO.ts'
import Plugin from '../model/entity/Plugin.ts'
import DatabaseClient from '../database/DatabaseClient.ts'

export default class PluginTaskUrlListenerDao extends BaseDao<PluginTaskUrlListenerQueryDTO, PluginTaskUrlListener> {
  constructor(db: DatabaseClient, injectedDB: boolean) {
    super('plugin_task_url_listener', PluginTaskUrlListener, db, injectedDB)
  }

  /**
   * 获取监听此url的插件
   * @param url
   */
  async listListener(url: string): Promise<Plugin[]> {
    const db = this.acquire()
    const statement = `SELECT DISTINCT t1.* FROM plugin t1 INNER JOIN ${this.tableName} t2 ON t1.id = t2.plugin_id WHERE @url REGEXP t2.listener ORDER BY t1.sort_num`
    return db
      .all<unknown[], Record<string, unknown>>(statement, { url: url })
      .then((result) => this.toResultTypeDataList<Plugin>(result))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  async listByPluginIds(pluginIds: number[]): Promise<PluginTaskUrlListener[]> {
    const db = this.acquire()
    const idStr = pluginIds.join(', ')
    const statement = `SELECT t1.* FROM ${this.tableName} t1 WHERE plugin_id IN (${idStr})`
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((result) => this.toResultTypeDataList<PluginTaskUrlListener>(result))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
