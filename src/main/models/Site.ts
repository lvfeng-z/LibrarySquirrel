/**
 * 站点
 */
export default class Site {
  id: string
  name: string //站点名称
  domain: string //站点域名
  constructor(id: string, name: string, domain: string) {
    this.id = id
    this.name = name
    this.domain = domain
  }
}
