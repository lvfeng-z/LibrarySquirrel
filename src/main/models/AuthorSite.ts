/**
 * 站点作者
 */

export default class AuthorSite {
  id: string
  site_id: number
  site_author_id: string
  site_author_name: string
  introduce: string
  local_author_id: number
  constructor(
    id: string,
    site_id: number,
    site_author_id: string,
    site_author_name: string,
    introduce: string,
    local_author_id: number
  ) {
    this.id = id
    this.site_id = site_id
    this.site_author_id = site_author_id
    this.site_author_name = site_author_name
    this.introduce = introduce
    this.local_author_id = local_author_id
  }
}
