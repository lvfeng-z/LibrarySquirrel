import { VNode } from 'vue'

export default class NotificationItem {
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
   * 此Promise解决时会从通知Store中移除对象，如果返回了字符串则会将其作为文本在右上角进行通知
   */
  removeOnSettle: Promise<string | undefined> | undefined

  /**
   * 通知组件的关闭延时
   */
  noticeDuration: number

  constructor() {
    this.id = ''
    this.title = ''
    this.description = ''
    this.render = undefined
    this.noticeDuration = 3000
  }
}
