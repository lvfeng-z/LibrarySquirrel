// DataTable的操作栏按钮或下拉菜单按钮
interface OperationItem<RuleParam> {
  label: string
  icon: string
  code: string
  buttonType?: string
  rule?: (row: RuleParam) => boolean
}

export default OperationItem
