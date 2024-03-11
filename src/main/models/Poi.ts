/**
 * 兴趣点
 */

import Tag from './Tag'
export default class Poi {
  id: string
  name: string //兴趣点名称
  tags: Tag[] //兴趣点对应tag
  constructor(id: string, name: string, tags: Tag[]) {
    this.id = id
    this.name = name
    this.tags = tags
  }
}
