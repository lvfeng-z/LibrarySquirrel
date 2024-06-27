import BaseDao from './BaseDao.ts'
import TaskPluginListener from '../model/TaskPluginListener.ts'
import TaskPluginListenerQueryDTO from '../model/queryDTO/TaskPluginListenerQueryDTO.ts'
import InstalledPlugins from '../model/InstalledPlugins.ts'
import DB from '../database/DB.ts'

export default class TaskPluginListenerDao extends BaseDao<
  TaskPluginListenerQueryDTO,
  TaskPluginListener
> {
  constructor(db?: DB) {
    super('task_plugin_listener', 'TaskPluginListenerDao', db)
  }

  protected getPrimaryKeyColumnName(): string {
    return 'id'
  }

  /**
   * 获取监听此url的插件
   * @param url
   */
  async getMonitored(url: string) {
    const db = this.acquire()
    try {
      const statement = `select distinct t1.* from installed_plugins t1 inner join task_plugin_listener t2 on t1.id = t2.plugin_id where '${url}' REGEXP t2.listener order by t1.sort_num`
      const result = (await db.prepare(statement)).all() as object[]
      return this.getResultTypeDataList<InstalledPlugins>(result)
    } finally {
      db.release()
    }
  }
}
