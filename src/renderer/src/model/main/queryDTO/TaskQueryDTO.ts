import BaseQueryDTO from './BaseQueryDTO.js'

export default class TaskQueryDTO extends BaseQueryDTO {
  /**
   * 是否是父任务
   */
  isCollection: boolean | undefined | null

  /**
   * 上级任务id
   */
  pid: number | number[] | undefined | null

  /**
   * 任务名称
   */
  taskName: string | undefined | null

  /**
   * 任务的站点id
   */
  siteId: string | undefined | null

  /**
   * 站点作品id
   */
  siteWorksId: number | undefined | null

  /**
   * 当任务是父任务时，url存储创建此父任务所使用的url，否则存储的是下载资源的链接（由于存在临时的下载链接，此字段可能没有作用）
   */
  url: string | undefined | null

  /**
   * 状态（0：未开始，1：进行中，2：暂停，3：已完成，4：失败）
   */
  status: number | undefined | null

  /**
   * 保存中的资源id
   */
  pendingResourceId: number | undefined | null

  /**
   * 保存中的文件路径
   */
  pendingSavePath: string | undefined | null

  /**
   * 资源是否支持续传
   */
  continuable: boolean | undefined | null

  /**
   * 插件id
   */
  pluginId: number | undefined | null

  /**
   * 插件信息
   */
  pluginInfo: string | undefined | null

  /**
   * 插件数据
   */
  pluginData: { [key: string]: unknown } | string | undefined | null

  /**
   * 错误信息
   */
  errorMessage: string | undefined | null

  constructor(task?: TaskQueryDTO) {
    super(task)
    if (task === undefined) {
      this.isCollection = undefined
      this.pid = undefined
      this.taskName = undefined
      this.siteId = undefined
      this.siteWorksId = undefined
      this.url = undefined
      this.status = undefined
      this.pendingResourceId = undefined
      this.pendingSavePath = undefined
      this.continuable = undefined
      this.pluginId = undefined
      this.pluginInfo = undefined
      this.pluginData = undefined
      this.errorMessage = undefined
    } else {
      this.isCollection = task.isCollection
      this.pid = task.pid
      this.taskName = task.taskName
      this.siteId = task.siteId
      this.siteWorksId = task.siteWorksId
      this.url = task.url
      this.status = task.status
      this.pendingResourceId = task.pendingResourceId
      this.pendingSavePath = task.pendingSavePath
      this.continuable = task.continuable
      this.pluginId = task.pluginId
      this.pluginInfo = task.pluginInfo
      if (typeof task.pluginData === 'string') {
        this.pluginData = JSON.parse(task.pluginData)
      } else {
        this.pluginData = task.pluginData
      }
      this.errorMessage = task.errorMessage
    }
  }
}
