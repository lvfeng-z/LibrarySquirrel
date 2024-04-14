/**
 * 任务
 */

export default class Task {
  /**
   * 主键
   */
  id: number
  /**
   * 任务链接的站点id
   */
  siteId: number
  /**
   * 作品id
   */
  worksId: number
  /**
   * 链接
   */
  url: string
  /**
   * 创建时间
   */
  createTime: number
  /**
   * 状态（0：未开始，1：进行中，2：暂停，3：已完成，4：失败）
   */
  status: number
  constructor(task: Task) {
    this.id = task.id
    this.siteId = task.siteId
    this.worksId = task.worksId
    this.url = task.url
    this.createTime = task.createTime
    this.status = task.status
  }
}
