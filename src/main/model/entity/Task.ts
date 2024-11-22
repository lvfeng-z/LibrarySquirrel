import BaseModel from './BaseModel.ts'

/**
 * 任务
 */
export default class Task extends BaseModel {
  /**
   * 主键
   */
  id: number | undefined | null

  /**
   * 是否是父任务
   */
  isCollection: boolean | undefined | null

  /**
   * 上级任务id
   */
  pid: number | undefined | null

  /**
   * 任务名称
   */
  taskName: string | undefined | null

  /**
   * 任务的站点domain
   */
  siteDomain: string | undefined | null

  /**
   * 本地作品id/本地作品集id
   */
  localWorksId: number | undefined | null

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
   * 下载中的文件路径
   */
  pendingDownloadPath: string | undefined | null

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

  constructor(task?: Task) {
    if (task === undefined) {
      super()
      this.id = undefined
      this.isCollection = undefined
      this.pid = undefined
      this.taskName = undefined
      this.siteDomain = undefined
      this.localWorksId = undefined
      this.siteWorksId = undefined
      this.url = undefined
      this.status = undefined
      this.pendingDownloadPath = undefined
      this.continuable = undefined
      this.pluginId = undefined
      this.pluginInfo = undefined
      this.pluginData = undefined
    } else {
      super(task)
      this.id = task.id
      this.isCollection = task.isCollection
      this.pid = task.pid
      this.taskName = task.taskName
      this.siteDomain = task.siteDomain
      this.localWorksId = task.localWorksId
      this.siteWorksId = task.siteWorksId
      this.url = task.url
      this.status = task.status
      this.pendingDownloadPath = task.pendingDownloadPath
      this.continuable = task.continuable
      this.pluginId = task.pluginId
      this.pluginInfo = task.pluginInfo
      if (typeof task.pluginData === 'string') {
        this.pluginData = JSON.parse(task.pluginData)
      } else {
        this.pluginData = task.pluginData
      }
    }
  }

  /**
   * 清除所有插件不应处理的属性值
   */
  legalize() {
    this.id = undefined
    this.createTime = undefined
    this.updateTime = undefined
    this.isCollection = undefined
    this.pid = undefined
    this.siteDomain = undefined
    this.localWorksId = undefined
    this.status = undefined
    this.pluginId = undefined
    this.pluginInfo = undefined
  }
}
