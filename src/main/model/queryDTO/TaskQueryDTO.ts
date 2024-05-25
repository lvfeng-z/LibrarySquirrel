import BaseQueryDTO from './BaseQueryDTO.ts'

export default class TaskQueryDTO extends BaseQueryDTO {
  /**
   * 是否有子任务
   */
  hasChildren: boolean | undefined | null
  /**
   * 上级任务id
   */
  parentId: number | undefined | null
  /**
   * 任务的站点id
   */
  siteId: number | undefined | null
  /**
   * 本地作品id
   */
  localWorksId: number | undefined | null
  /**
   * 站点作品id
   */
  siteWorksId: number | undefined | null
  /**
   * 链接
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
      this.hasChildren = undefined
      this.parentId = undefined
      this.siteId = undefined
      this.localWorksId = undefined
      this.siteWorksId = undefined
      this.url = undefined
      this.status = undefined
      this.pluginData = undefined
    } else {
      super(task)
      this.hasChildren = task.hasChildren
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
