import { ElMessageBoxOptions } from 'element-plus/es/components/message-box/src/message-box.type'
import { SubPageEnum } from '@renderer/constants/Subpage.ts'

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
   * 页面
   */
  page: SubPageEnum

  /**
   * 额外数据
   */
  extraData?: unknown
}
