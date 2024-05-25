import BaseQueryDTO from './BaseQueryDTO.ts'

export default class TaskQueryDTO extends BaseQueryDTO {
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
   * 插件数据
   */
  pluginData: { [key: string]: unknown } | undefined | null

  constructor(task?: TaskQueryDTO) {
    if (task === undefined) {
      super()
      this.isCollection = undefined
      this.parentId = undefined
      this.siteId = undefined
      this.localWorksId = undefined
      this.siteWorksId = undefined
      this.url = undefined
      this.status = undefined
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
      if (typeof task.pluginData === 'string') {
        this.pluginData = JSON.parse(task.pluginData)
      } else {
        this.pluginData = task.pluginData
      }
    }
  }
}