// DataTable的表头
import { IsNullish } from '@renderer/utils/CommonUtil.ts'
import { IPopperInputConfig, PopperInputConfig } from '@renderer/model/util/PopperInputConfig.ts'
import SelectItem from '@renderer/model/util/SelectItem.ts'

export class Thead<Data> extends PopperInputConfig implements IThead<Data> {
  key: string // 值的键名
  title?: string // 标题名称
  hide?: boolean // 是否隐藏
  width?: number // 数据列宽度
  minWidth?: number // 数据列最小宽度
  headerAlign?: 'center' | 'left' | 'right' // 标题停靠位置
  headerTagType?: 'warning' | 'info' | 'success' | 'primary' | 'danger' // 标题使用的el-tag样式
  dataAlign?: 'center' | 'left' | 'right' // 数据停靠位置
  fixed?: 'left' | 'right' | boolean // 是否固定列
  showOverflowTooltip?: boolean // 是否隐藏额外内容并在单元格悬停时使用 Tooltip 显示它们
  editMethod?: 'replace' | 'popper'
  getCacheData: (rowData: Data) => SelectItem | undefined // 获取行数据中的缓存数据（用于选择组件在没有获取选择列表前的数据回显）
  setCacheData: (rowData: Data, data: SelectItem) => void // 设置行数据中的缓存数据（用于选择组件在没有获取选择列表前的数据回显）

  constructor(thead: IThead<Data>) {
    super(thead)
    this.key = thead.key
    this.title = thead.title
    this.hide = IsNullish(thead.hide) ? false : thead.hide
    this.width = thead.width
    this.minWidth = thead.minWidth
    this.headerAlign = thead.headerAlign
    this.headerTagType = thead.headerTagType
    this.dataAlign = thead.dataAlign
    this.fixed = IsNullish(thead.fixed) ? false : thead.fixed
    this.showOverflowTooltip = IsNullish(thead.showOverflowTooltip) ? false : thead.showOverflowTooltip
    this.editMethod = IsNullish(thead.editMethod) ? 'replace' : thead.editMethod
    this.getCacheData = IsNullish(thead.getCacheData) ? () => undefined : thead.getCacheData
    this.setCacheData = IsNullish(thead.setCacheData) ? () => {} : thead.setCacheData
  }
}

export interface IThead<Data> extends IPopperInputConfig {
  key: string // 值的键名
  title?: string // 标题名称
  hide?: boolean // 是否隐藏
  width?: number // 数据列宽度
  minWidth?: number // 数据列最小宽度
  headerAlign?: 'center' | 'left' | 'right' // 标题停靠位置
  headerTagType?: 'warning' | 'info' | 'success' | 'primary' | 'danger' // 标题使用的el-tag样式
  dataAlign?: 'center' | 'left' | 'right' // 数据停靠位置
  fixed?: 'left' | 'right' | boolean // 是否固定列
  showOverflowTooltip?: boolean // 列超出长度时是否省略
  editMethod?: 'replace' | 'popper'
  getCacheData?: (rowData: Data) => SelectItem | undefined
  setCacheData?: (rowData: Data, data: SelectItem) => void
}
