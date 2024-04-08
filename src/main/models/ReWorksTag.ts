/**
 * 作品-标签关联表
 */
export default class ReWorksTag {
  id: string
  works_id: number
  tag_id: string
  tag_type: boolean
  tag_site_id: number
  create_time: string
  constructor(
    id: string,
    works_id: number,
    tag_id: string,
    tag_type: boolean,
    tag_site_id: number,
    create_time: string
  ) {
    this.id = id
    this.works_id = works_id
    this.tag_id = tag_id
    this.tag_type = tag_type
    this.tag_site_id = tag_site_id
    this.create_time = create_time
  }
}
