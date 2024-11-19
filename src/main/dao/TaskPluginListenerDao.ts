import BaseDao from './BaseDao.ts'
import TaskPluginListener from '../model/TaskPluginListener.ts'
import TaskPluginListenerQueryDTO from '../model/queryDTO/TaskPluginListenerQueryDTO.ts'
import Plugin from '../model/Plugin.ts'
import DB from '../database/DB.ts'

export default class TaskPluginListenerDao extends BaseDao<TaskPluginListenerQueryDTO, TaskPluginListener> {
  constructor(db?: DB) {
    super('task_plugin_listener', 'TaskPluginListenerDao', db)
  }

  /**
   * 获取监听此url的插件
   * @param url
   */
  async listListener(url: string): Promise<Plugin[]> {
    const db = this.acquire()
    const statement = `select distinct t1.* from plugin t1 inner join task_plugin_listener t2 on t1.id = t2.plugin_id where '${url}' REGEXP t2.listener order by t1.sort_num`
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((result) => this.getResultTypeDataList<Plugin>(result))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }
}
