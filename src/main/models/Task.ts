/**
 * 任务
 */

export default class Task {
  id: number
  site_id: number
  works_id: number
  url: string
  create_time: number
  status: number
  constructor(
    id: number,
    site_id: number,
    works_id: number,
    url: string,
    create_time: number,
    status: number
  ) {
    this.id = id
    this.site_id = site_id
    this.works_id = works_id
    this.url = url
    this.create_time = create_time
    this.status = status
  }
}
