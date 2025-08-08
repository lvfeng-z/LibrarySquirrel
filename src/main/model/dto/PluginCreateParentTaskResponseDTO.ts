import PluginCreateTaskResponseDTO from './PluginCreateTaskResponseDTO.js'
import TaskCreateDTO from './TaskCreateDTO.js'

/**
 * 创建任务DTO
 */
export default class PluginCreateParentTaskResponseDTO {
  /**
   * 插件在流式创建时用于标识父任务的id
   */
  pluginTaskId: string | undefined

  /**
   * 任务名称
   */
  taskName: string | undefined | null

  /**
   * 站点作品id
   */
  siteWorksId: string | undefined | null

  /**
   * 来源url
   */
  url: string | undefined | null

  /**
   * 插件数据
   */
  pluginData: { [key: string]: unknown } | string | undefined | null

  /**
   * 站点domain
   */
  siteDomain: string | undefined | null

  /**
   * 子任务
   */
  children: PluginCreateTaskResponseDTO[] = []

  public static toTaskCreateDTO(pluginParentTaskResponseDTO: PluginCreateParentTaskResponseDTO): TaskCreateDTO {
    const result = new TaskCreateDTO()
    result.taskName = pluginParentTaskResponseDTO.taskName
    result.siteWorksId = pluginParentTaskResponseDTO.siteWorksId
    result.url = pluginParentTaskResponseDTO.url
    result.pluginData = pluginParentTaskResponseDTO.pluginData
    result.siteDomain = pluginParentTaskResponseDTO.siteDomain
    return result
  }
}
