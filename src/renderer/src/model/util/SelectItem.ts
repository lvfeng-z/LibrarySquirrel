import { isNullish } from '@renderer/utils/CommonUtil.ts'

/**
 * 下拉选择框选项
 */
export default class SelectItem {
  value: string | number
  label: string
  subLabels?: string[]
  disabled?: boolean
  rootId?: string | null | undefined
  extraData?: object | null | undefined

  constructor(selectItem: CSelectItem) {
    this.value = isNullish(selectItem.value) ? '' : selectItem.value
    this.label = isNullish(selectItem.label) ? '' : selectItem.label
    this.subLabels = selectItem.subLabels
    this.disabled = selectItem.disabled
    this.rootId = selectItem.rootId
    this.extraData = selectItem.extraData
  }
}

type CSelectItem = {
  value?: string | number
  label?: string
  subLabels?: string[]
  disabled?: boolean
  rootId?: string | null | undefined
  extraData?: object | null | undefined
}
