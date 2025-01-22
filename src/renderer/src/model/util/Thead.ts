// DataTable的表头
import { IsNullish } from '@renderer/utils/CommonUtil.ts'
import { IPopperInputConfig, PopperInputConfig } from '@renderer/model/util/PopperInputConfig.ts'

export class Thead extends PopperInputConfig implements IThead {
  name: string // 字段名
  label?: string // 标题名称
  hide?: boolean // 是否隐藏
  width?: number // 数据列宽度
  headerAlign?: 'center' | 'left' | 'right' // 标题停靠位置
  headerTagType?: 'warning' | 'info' | 'success' | 'primary' | 'danger' // 标题使用的el-tag样式
  dataAlign?: 'center' | 'left' | 'right' // 数据停靠位置
  overHide?: boolean //列超出长度时是否省略
  editMethod?: 'replace' | 'popper'

  constructor(thead: IThead) {
    super(thead)
    this.name = thead.name
    this.label = thead.label
    this.hide = IsNullish(thead.hide) ? false : thead.hide
    this.width = thead.width
    this.headerAlign = thead.headerAlign
    this.headerTagType = thead.headerTagType
    this.dataAlign = thead.dataAlign
    this.overHide = IsNullish(thead.overHide) ? false : thead.overHide
    this.editMethod = IsNullish(thead.editMethod) ? 'popper' : thead.editMethod
  }
}

export interface IThead extends IPopperInputConfig {
  name: string // 字段名
  label?: string // 标题名称
  hide?: boolean // 是否隐藏
  width?: number // 数据列宽度
  headerAlign?: 'center' | 'left' | 'right' // 标题停靠位置
  headerTagType?: 'warning' | 'info' | 'success' | 'primary' | 'danger' // 标题使用的el-tag样式
  dataAlign?: 'center' | 'left' | 'right' // 数据停靠位置
  overHide?: boolean //列超出长度时是否省略
  editMethod?: 'replace' | 'popper'
}
