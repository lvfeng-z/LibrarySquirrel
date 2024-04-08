/**
 * 作品集合
 */

export default class WorksSet {
  id: string
  set_name: string
  site_id: number
  site_works_id: string
  site_works_name: string
  site_author_id: string
  site_upload_time: string
  site_update_time: string
  nick_name: string
  local_author: number
  create_time: number
  constructor(
    id: string,
    set_name: string,
    site_id: number,
    site_works_id: string,
    site_works_name: string,
    site_author_id: string,
    site_upload_time: string,
    site_update_time: string,
    nick_name: string,
    local_author: number,
    create_time: number
  ) {
    this.id = id
    this.set_name = set_name
    this.site_id = site_id
    this.site_works_id = site_works_id
    this.site_works_name = site_works_name
    this.site_author_id = site_author_id
    this.site_upload_time = site_upload_time
    this.site_update_time = site_update_time
    this.nick_name = nick_name
    this.local_author = local_author
    this.create_time = create_time
  }
}
