import TaskCreateDTO from './TaskCreateDTO.js'

/**
 * 创建任务DTO
 */
export default class PluginTaskResponseDTO {
  /**
   * 任务名称
   */
  taskName: string | undefined | null

  /**
   * 站点作品id
   */
  siteWorksId: string | undefined | null

  /**
   来源url
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
   * 资源是否支持续传
   */
  continuable: boolean | undefined | null

  public static toTaskCreateDTO(pluginTaskResponseDTO: PluginTaskResponseDTO): TaskCreateDTO {
    const result = new TaskCreateDTO()
    result.taskName = pluginTaskResponseDTO.taskName
    result.siteWorksId = pluginTaskResponseDTO.siteWorksId
    result.url = pluginTaskResponseDTO.url
    result.pluginData = pluginTaskResponseDTO.pluginData
    result.siteDomain = pluginTaskResponseDTO.siteDomain
    result.continuable = pluginTaskResponseDTO.continuable
    return result
  }
}
