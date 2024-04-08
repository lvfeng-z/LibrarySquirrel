/**
 * 站点作者
 * 站点作者对应本地作者，用于处理一个作者在多个站点活动的情况
 */
import Site from './Site'
import AuthorSite from './AuthorSite'

export default class SiteAuthor {
  id: string
  site: Site //站点
  author: AuthorSite //本地作者
  author_id: string //作者在站点的编号
  author_name: string //作者在站点的名称
  constructor(id: string, site: Site, author: AuthorSite, author_id: string, author_name: string) {
    this.id = id
    this.site = site
    this.author = author
    this.author_id = author_id
    this.author_name = author_name
  }
}
