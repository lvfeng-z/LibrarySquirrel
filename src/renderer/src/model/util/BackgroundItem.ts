import { VNode } from 'vue'

export default class BackgroundItem {
  /**
   * 唯一标识
   */
  id: string

  /**
   * 标题
   */
  title: string

  /**
   * 描述
   */
  description: string

  /**
   * 自定义区域渲染函数
   */
  render: (() => VNode) | undefined

  /**
   * 结束时触发移除操作
   */
  removeOnSettle: Promise<string> | undefined

  /**
   * 移除时是否发出提醒
   */
  noticeOnRemove: boolean

  /**
   * 通知组件的关闭延时
   */
  noticeDuration: number

  constructor() {
    this.id = ''
    this.title = ''
    this.description = ''
    this.render = undefined
    this.noticeOnRemove = false
    this.noticeDuration = 3000
  }
}
