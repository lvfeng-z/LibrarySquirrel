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
  selectData?: SelectItem[] | TreeSelectNode[] // 选择列表数据
  useLoad?: boolean // 是否load函数获得选择列表数据
  load?: (query?: unknown) => Promise<SelectItem[] | TreeSelectNode[]> // 给selectData赋值的函数
  lazy?: boolean // 选择列表是否开启懒加载
  treeLoad?: (node, resolve, query?: unknown) => Promise<SelectItem[] | TreeSelectNode[]>

  constructor(config: ICommonInputConfig) {
    this.type = config.type
    this.defaultDisabled = config.defaultDisabled
    this.dblclickToEdit = config.dblclickToEdit
    this.selectData = config.selectData
    this.useLoad = config.useLoad
    this.load = config.load
    this.placeholder = config.placeholder
    this.render = config.render
  }

  public refreshSelectData(query?: unknown) {
    if (NotNullish(this.load)) {
      this.load(query).then((data) => (this.selectData = data))
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
  selectData?: SelectItem[] | TreeSelectNode[] // 选择列表数据
  useLoad?: boolean // 是否load函数获得选择列表数据
  load?: (c) => Promise<SelectItem[] | TreeSelectNode[]> // 给selectData赋值的函数
  lazy?: boolean // 选择列表是否开启懒加载
}
