/**
 * 作品集合
 */
import Site from './Site'
import Author from './Author'
import Artwork from './Artwork'
export default class ArtworkSet {
  id: string
  artist: Author[] //作者（可能多个）
  source: Site //作品来源
  source_id: string //作品在来源站点的id
  name: string //作品名称
  alias: string //作品别名
  publish_time: Date //作品发布时间
  create_time: Date //创建时间
  item_list: Artwork[] //作品列表
  constructor(
    id: string,
    artist: Author[],
    source: Site,
    source_id: string,
    name: string,
    alias: string,
    publish_time: Date,
    create_time: Date,
    item_list: Artwork[]
  ) {
    this.id = id
    this.artist = artist
    this.source = source
    this.source_id = source_id
    this.name = name
    this.alias = alias
    this.publish_time = publish_time
    this.create_time = create_time
    this.item_list = item_list
  }
}
