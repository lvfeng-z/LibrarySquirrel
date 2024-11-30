import BaseEntity from './BaseEntity.ts'

export default class TaskPluginListener extends BaseEntity {
  /**
   * 插件id
   */
  pluginId: number | undefined | null

  /**
   * 监听表达式
   */
  listener: string | undefined | null

  constructor(taskPluginListener?: TaskPluginListener) {
    if (taskPluginListener === undefined) {
      super()
    } else {
      super(taskPluginListener)
      this.pluginId = taskPluginListener.pluginId
      this.listener = taskPluginListener.listener
    }
  }
}
