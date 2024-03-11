/**
 * 标签
 */

export default class Tag {
  id: string
  tag_source: string //tag来源
  name: string //tag名称
  base_tag: string //本源tag的Id
  constructor(id: string, tag_source: string, name: string, base_tag_id: string) {
    this.id = id
    this.tag_source = tag_source
    this.name = name
    this.base_tag = base_tag_id
  }
}
