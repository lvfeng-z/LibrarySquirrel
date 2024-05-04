export interface InputBox {
  name: string // 字段名
  placeholder: string // 占位符
  show?: boolean // 是否展示本InputBox
  inputType?: 'text' | 'date' | 'dateTime' | 'number' | 'textarea' // 输入组件类型
  inputSpan?: number // 输入组件宽度
  disabled?: boolean // 是否禁用
  label?: string // 标题名称
  labelSpan?: number // 标题宽度
  showLabel?: boolean // 是否展示标题
}