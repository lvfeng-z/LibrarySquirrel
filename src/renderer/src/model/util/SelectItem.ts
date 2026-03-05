import { isNullish } from '@shared/util/CommonUtil.ts'

/**
 * 下拉选择框选项
 */
export default class SelectItem {
  value: string | number
  label: string
  subLabels?: string[]
  rootId?: string | null | undefined
  extraData?: object | null | undefined

  constructor(selectItem: CSelectItem) {
    this.value = isNullish(selectItem.value) ? '' : selectItem.value
    this.label = isNullish(selectItem.label) ? '' : selectItem.label
    this.subLabels = selectItem.subLabels
    this.rootId = selectItem.rootId
    this.extraData = selectItem.extraData
  }
}

export interface CSelectItem {
  value?: string | number
  label?: string
  subLabels?: string[]
  rootId?: string | null | undefined
  extraData?: object | null | undefined
}
