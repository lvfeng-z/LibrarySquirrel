import BaseDao from '../base/BaseDao.ts'
import PluginTaskUrlListener from '../model/entity/PluginTaskUrlListener.ts'
import PluginTaskUrlListenerQueryDTO from '../model/queryDTO/PluginTaskUrlListenerQueryDTO.ts'
import Plugin from '../model/entity/Plugin.ts'
import DB from '../database/DB.ts'

export default class PluginTaskUrlListenerDao extends BaseDao<PluginTaskUrlListenerQueryDTO, PluginTaskUrlListener> {
  constructor(db: DB, injectedDB: boolean) {
    super('plugin_task_url_listener', PluginTaskUrlListener, db, injectedDB)
  }

  /**
   * 获取监听此url的插件
   * @param url
   */
  async listListener(url: string): Promise<Plugin[]> {
    const db = this.acquire()
    const statement = `SELECT DISTINCT t1.* FROM plugin t1 INNER JOIN task_plugin_listener t2 ON t1.id = t2.plugin_id WHERE @url REGEXP t2.listener ORDER BY t1.sort_num`
    return db
      .all<unknown[], Record<string, unknown>>(statement, { url: url })
      .then((result) => this.toResultTypeDataList<Plugin>(result))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
