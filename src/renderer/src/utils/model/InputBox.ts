export interface InputBox {
  name: string // 字段名
  inputType: string // 输入组件类型
  dataType: string // 数据类型
  placeholder: string // 占位符
  inputSpan?: number // 输入组件宽度
  label?: string // 标题名称
  labelSpan?: number // 标题宽度
  showLabel?: boolean // 是否展示标题
}
