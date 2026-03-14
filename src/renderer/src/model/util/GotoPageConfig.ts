import { ElMessageBoxOptions } from 'element-plus/es/components/message-box/src/message-box.type'

export default interface GotoPageConfig {
  /**
   * 标题
   */
  title: string

  /**
   * 内容
   */
  content: string

  /**
   * ElMessageBox配置
   */
  options: ElMessageBoxOptions

  /**
   * 路由路径
   */
  path: string

  /**
   * 额外数据
   */
  extraData?: unknown
}
