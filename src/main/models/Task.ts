/**
 * 任务
 */

export default class Task {
  id: number
  siteId: number
  worksId: number
  url: string
  createTime: number
  status: number
  constructor(
    id: number,
    siteId: number,
    worksId: number,
    url: string,
    createTime: number,
    status: number
  ) {
    this.id = id
    this.siteId = siteId
    this.worksId = worksId
    this.url = url
    this.createTime = createTime
    this.status = status
  }
}
