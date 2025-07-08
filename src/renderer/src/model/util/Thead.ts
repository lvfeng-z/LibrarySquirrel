// DataTable的表头
import { IsNullish } from '@renderer/utils/CommonUtil.ts'
import { IPopperInputConfig, PopperInputConfig } from '@renderer/model/util/PopperInputConfig.ts'

export class Thead extends PopperInputConfig implements IThead {
  key: string // 值的键名
  title?: string // 标题名称
  hide?: boolean // 是否隐藏
  width?: number // 数据列宽度
  headerAlign?: 'center' | 'left' | 'right' // 标题停靠位置
  headerTagType?: 'warning' | 'info' | 'success' | 'primary' | 'danger' // 标题使用的el-tag样式
  dataAlign?: 'center' | 'left' | 'right' // 数据停靠位置
  fixed?: 'left' | 'right' | boolean // 是否固定列
  showOverflowTooltip?: boolean // 是否隐藏额外内容并在单元格悬停时使用 Tooltip 显示它们
  editMethod?: 'replace' | 'popper'
  cacheDataKey?: string

  constructor(thead: IThead) {
    super(thead)
    this.key = thead.key
    this.title = thead.title
    this.hide = IsNullish(thead.hide) ? false : thead.hide
    this.width = thead.width
    this.headerAlign = thead.headerAlign
    this.headerTagType = thead.headerTagType
    this.dataAlign = thead.dataAlign
    this.fixed = IsNullish(thead.fixed) ? false : thead.fixed
    this.showOverflowTooltip = IsNullish(thead.showOverflowTooltip) ? false : thead.showOverflowTooltip
    this.editMethod = IsNullish(thead.editMethod) ? 'popper' : thead.editMethod
    this.cacheDataKey = thead.cacheDataKey
  }
}

export interface IThead extends IPopperInputConfig {
  key: string // 值的键名
  title?: string // 标题名称
  hide?: boolean // 是否隐藏
  width?: number // 数据列宽度
  headerAlign?: 'center' | 'left' | 'right' // 标题停靠位置
  headerTagType?: 'warning' | 'info' | 'success' | 'primary' | 'danger' // 标题使用的el-tag样式
  dataAlign?: 'center' | 'left' | 'right' // 数据停靠位置
  fixed?: 'left' | 'right' | boolean // 是否固定列
  showOverflowTooltip?: boolean // 列超出长度时是否省略
  editMethod?: 'replace' | 'popper'
  cacheDataKey?: string
}
