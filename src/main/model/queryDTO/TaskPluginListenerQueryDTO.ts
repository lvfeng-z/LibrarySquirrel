import BaseQueryDTO from './BaseQueryDTO.ts'

export default class TaskPluginListenerQueryDTO extends BaseQueryDTO {
  /**
   * 插件id
   */
  pluginId: number | undefined | null

  /**
   * 监听表达式
   */
  listener: string | undefined | null

  constructor(taskPluginListenerQueryDTO?: TaskPluginListenerQueryDTO) {
    if (taskPluginListenerQueryDTO === undefined) {
      super()
    } else {
      super(taskPluginListenerQueryDTO)
      this.pluginId = taskPluginListenerQueryDTO.pluginId
      this.listener = taskPluginListenerQueryDTO.listener
    }
  }
}
