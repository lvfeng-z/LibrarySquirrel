/**
 * 作品
 */
import site from './Site'
import Author from './Author'
export default class Artwork {
  id: string
  artist: Author[] //作者（可能多个）
  source: site //作品来源
  source_id: string //作品在来源站点的id
  name: string //作品名称
  alias: string //作品别名
  set_id: string //作品集编号
  publish_time: Date //作品发布时间
  create_time: Date //创建时间
  sort_num: number //排序号
  constructor(
    id: string,
    artist: Author[],
    source: site,
    source_id: string,
    name: string,
    alias: string,
    set_id: string,
    publish_time: Date,
    create_time: Date,
    sort_num: number
  ) {
    this.id = id
    this.artist = artist
    this.source = source
    this.source_id = source_id
    this.name = name
    this.alias = alias
    this.set_id = set_id
    this.publish_time = publish_time
    this.create_time = create_time
    this.sort_num = sort_num
  }
}
