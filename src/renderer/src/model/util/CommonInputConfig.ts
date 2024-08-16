import SelectItem from './SelectItem.ts'
import ApiResponse from './ApiResponse.ts'
import { VNode } from 'vue'

interface CommonInputConfig {
  type:
    | 'default'
    | 'text'
    | 'date'
    | 'datetime'
    | 'number'
    | 'textarea'
    | 'checkbox'
    | 'radio'
    | 'select'
    | 'selectTree'
    | 'switch'
    | 'custom' // 类型
  defaultDisabled?: boolean // 默认是否开启
  dblclickEnable?: boolean // 是否可以双击启用
  selectData?: SelectItem[] // 选择框数据
  useApi?: boolean // 是否请求接口获得选择框数据
  api?: (params?: unknown) => Promise<ApiResponse> // 选择框接口
  pagingApi?: boolean // 接口是否分页
  placeholder?: string // 占位符
  render?: (data?) => VNode | undefined
}

export default CommonInputConfig
