// DataTable的表头
import { CommonInputConfig } from './CommonInputConfig'
import { ApiResponse } from './ApiResponse'

export interface Thead extends CommonInputConfig {
  name: string // 字段名
  label: string // 标题名称
  hide: boolean // 是否隐藏
  width?: number // 数据列宽度
  headerAlign?: 'center' | 'left' | 'right' // 标题停靠位置
  headerTagType?: 'warning' | 'info' | 'success' | 'primary' | 'danger' // 标题使用的el-tag样式
  dataAlign?: 'center' | 'left' | 'right' // 数据停靠位置
  overHide?: boolean //列超出长度时是否省略
  selectData?: [] // 选择框的数据
  useApi?: boolean // 是否请求接口获得选择框数据
  api?: (params?: unknown) => Promise<ApiResponse> // 选择框接口
}
