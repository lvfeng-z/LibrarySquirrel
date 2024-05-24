import BaseModel from './BaseModel.ts'

/**
 * 任务
 */
export default class Task extends BaseModel {
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
   * 状态（0：未开始，1：进行中，2：暂停，3：已完成，4：失败）
   */
  status: number | undefined | null

  constructor(task?: Task) {
    if (task === undefined) {
      super()
      this.siteId = undefined
      this.worksId = undefined
      this.url = undefined
      this.status = undefined
    } else {
      super(task)
      this.siteId = task.siteId
      this.worksId = task.worksId
      this.url = task.url
      this.status = task.status
    }
  }
}
