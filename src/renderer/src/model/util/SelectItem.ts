/**
 * 下拉选择框选项
 */
export default class SelectItem {
  value: string | number
  label: string
  subLabels?: string[]
  state?: boolean
  rootId?: string | null | undefined
  extraData?: object | null | undefined

  constructor(selectItem: SelectItem) {
    this.value = selectItem.value
    this.label = selectItem.label
    this.subLabels = selectItem.subLabels
    this.rootId = selectItem.rootId
    this.extraData = selectItem.extraData
  }
}
