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
   * 当任务是父任务时，url存储创建此父任务所使用的url，否则存储的是下载资源的链接（由于存在临时的下载链接，此字段可能没有作用）
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
