import SelectItem from './SelectItem.ts'
import { VNode } from 'vue'
import TreeSelectNode from '@renderer/model/util/TreeSelectNode.ts'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

export class CommonInputConfig implements ICommonInputConfig {
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
    | 'treeSelect'
    | 'switch'
    | 'custom' // 类型
  defaultDisabled?: boolean // 默认是否开启
  dblclickToEdit?: boolean // 是否可以双击启用
  placeholder?: string // 占位符
  render?: (data?) => VNode
  selectList?: SelectItem[] | TreeSelectNode[] // select | treeSelect - 选择列表数据
  remote?: boolean // select | treeSelect - 是否使用remoteMethod函数获得选择列表数据
  remoteMethod?: (query?: unknown) => Promise<SelectItem[] | TreeSelectNode[]> // select | treeSelect - 给selectData赋值的函数
  lazy?: boolean // treeSelect - 选择列表是否开启懒加载
  load?: (rootId?, node?) => Promise<TreeSelectNode[]> // treeSelect - 懒加载函数

  constructor(config: ICommonInputConfig) {
    this.type = config.type
    this.defaultDisabled = config.defaultDisabled
    this.dblclickToEdit = config.dblclickToEdit
    this.placeholder = config.placeholder
    this.render = config.render
    this.selectList = config.selectList
    this.remote = config.remote
    this.remoteMethod = config.remoteMethod
    this.lazy = config.lazy
    this.load = config.load
  }

  public refreshSelectData(query?: unknown) {
    if (this.remote && NotNullish(this.remoteMethod)) {
      this.remoteMethod(query).then((data) => (this.selectList = data))
    }
  }
}

export interface ICommonInputConfig {
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
    | 'treeSelect'
    | 'switch'
    | 'custom' // 类型
  defaultDisabled?: boolean // 默认是否开启
  dblclickToEdit?: boolean // 是否可以双击启用
  placeholder?: string // 占位符
  render?: (data?) => VNode
  selectList?: SelectItem[] | TreeSelectNode[] // select | treeSelect - 选择列表数据
  remote?: boolean // select | treeSelect - 是否使用remoteMethod函数获得选择列表数据
  remoteMethod?: (query?) => Promise<SelectItem[] | TreeSelectNode[]> // select | treeSelect - 给selectData赋值的函数
  lazy?: boolean // treeSelect - 选择列表是否开启懒加载
  load?: (rootId?, node?) => Promise<TreeSelectNode[]> // treeSelect - 懒加载函数
}
