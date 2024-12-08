/**
 * 下拉选择框选项
 */
export default class SelectItem {
  value: string | number
  label: string
  secondaryLabel?: string // 用于double-check-tag
  subLabels?: string[]
  state?: boolean // 用于double-check-tag
  rootId?: string | null | undefined
  extraData?: object | null | undefined

  constructor(selectItem: SelectItem) {
    this.value = selectItem.value
    this.label = selectItem.label
    this.secondaryLabel = selectItem.secondaryLabel
    this.subLabels = selectItem.subLabels
    this.rootId = selectItem.rootId
    this.extraData = selectItem.extraData
  }
}
