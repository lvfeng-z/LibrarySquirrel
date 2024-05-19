// DataTable的操作栏按钮或下拉菜单按钮
interface OperationItem {
  label: string
  icon: string
  code: string
  buttonType?: string
  rule?: (row: { dataTableRowEdited: boolean }) => boolean
}

export default OperationItem
