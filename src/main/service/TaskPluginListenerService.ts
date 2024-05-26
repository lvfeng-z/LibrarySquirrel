import TaskPluginListener from '../model/TaskPluginListener.ts'
import TaskPluginListenerDao from '../dao/TaskPluginListenerDao.ts'

function saveBatch(entities: TaskPluginListener[]) {
  const dao = new TaskPluginListenerDao()
  return dao.saveBatch(entities)
}

/**
 * 获取监听此链接的插件
 */
function getMonitored(url: string) {
  const dao = new TaskPluginListenerDao()
  return dao.getMonitored(url)
}

export default {
  saveBatch,
  getMonitored
}
