import BaseModel from './BaseModel.ts'

/**
 * 任务
 */
export default class Task extends BaseModel {
  /**
   * 是否是任务集合
   */
  isCollection: boolean | undefined | null

  /**
   * 上级任务id
   */
  parentId: number | undefined | null

  /**
   * 任务的站点id
   */
  siteId: number | undefined | null

  /**
   * 本地作品id/本地作品集id
   */
  localWorksId: number | undefined | null

  /**
   * 站点作品id
   */
  siteWorksId: number | undefined | null

  /**
   * 当任务是任务集合时，url存储创建此任务集合所使用的url，否则存储的是下载资源的链接（由于存在临时的下载链接，此字段可能没有作用）
   */
  url: string | undefined | null

  /**
   * 状态（0：未开始，1：进行中，2：暂停，3：已完成，4：失败）
   */
  status: number | undefined | null

  /**
   * 插件id
   */
  pluginId: number | undefined | null

  /**
   * 插件信息
   */
  pluginInfo: number | undefined | null

  /**
   * 插件数据
   */
  pluginData: { [key: string]: unknown } | string | undefined | null

  constructor(task?: Task) {
    if (task === undefined) {
      super()
      this.isCollection = undefined
      this.parentId = undefined
      this.siteId = undefined
      this.localWorksId = undefined
      this.siteWorksId = undefined
      this.url = undefined
      this.status = undefined
      this.pluginId = undefined
      this.pluginInfo = undefined
      this.pluginData = undefined
    } else {
      super(task)
      this.isCollection = task.isCollection
      this.parentId = task.parentId
      this.siteId = task.siteId
      this.localWorksId = task.localWorksId
      this.siteWorksId = task.siteWorksId
      this.url = task.url
      this.status = task.status
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
  security() {
    this.id = undefined
    this.createTime = undefined
    this.updateTime = undefined
    this.isCollection = undefined
    this.parentId = undefined
    this.siteId = undefined
    this.localWorksId = undefined
    this.status = undefined
    this.pluginId = undefined
    this.pluginInfo = undefined
  }
}
