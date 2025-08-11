import SelectItem, { CSelectItem } from './SelectItem.ts'

export default class SegmentedTagItem extends SelectItem {
  disabled: boolean

  constructor(cSegmentedTagItem: CSegmentedTagItem) {
    super(cSegmentedTagItem)
    this.disabled = cSegmentedTagItem.disabled
  }
}

interface CSegmentedTagItem extends CSelectItem {
  disabled: boolean
}
