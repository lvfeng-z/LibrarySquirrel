/**
 * 任务
 */

export default class Task {
  /**
   * 主键
   */
  id: number | undefined | null
  /**
   * 任务链接的站点id
   */
  siteId: number | undefined | null
  /**
   * 作品id
   */
  worksId: number | undefined | null
  /**
   * 链接
   */
  url: string | undefined | null
  /**
   * 创建时间
   */
  createTime: number | undefined | null
  /**
   * 状态（0：未开始，1：进行中，2：暂停，3：已完成，4：失败）
   */
  status: number | undefined | null
  constructor(task: Task) {
    this.id = task.id
    this.siteId = task.siteId
    this.worksId = task.worksId
    this.url = task.url
    this.createTime = task.createTime
    this.status = task.status
  }
}
