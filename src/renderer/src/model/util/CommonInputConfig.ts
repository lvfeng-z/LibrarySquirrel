import SelectOption from './SelectOption.ts'
import ApiResponse from './ApiResponse.ts'

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
    | 'switch' // 类型
  defaultDisabled?: boolean // 默认是否开启
  dblclickEnable?: boolean // 是否可以双击启用
  selectData?: SelectOption[] // 选择框数据
  useApi?: boolean // 是否请求接口获得选择框数据
  api?: (params?: unknown) => Promise<ApiResponse> // 选择框接口
  placeholder?: string // 占位符
}

export default CommonInputConfig
