// DataTable的操作栏按钮或下拉菜单按钮
export interface OperationItem {
  label: string
  icon: string
  code: string
  rule?: (row: { dataTableRowEdited: boolean }) => boolean
}
