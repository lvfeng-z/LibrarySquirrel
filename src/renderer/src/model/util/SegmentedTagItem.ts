import SelectItem, { CSelectItem } from './SelectItem.ts'
import { IsNullish } from '@renderer/utils/CommonUtil.ts'

export default class SegmentedTagItem extends SelectItem {
  disabled: boolean
  mainBackGround?: string
  mainBackGroundHover?: string
  mainTextColor?: string
  subTextColor?: string
  sub1BackGround?: string
  sub1BackGroundHover?: string
  sub2BackGround?: string
  sub2BackGroundHover?: string

  constructor(cSegmentedTagItem: CSegmentedTagItem) {
    super(cSegmentedTagItem)
    this.disabled = IsNullish(cSegmentedTagItem.disabled) ? false : cSegmentedTagItem.disabled
    this.mainBackGround = cSegmentedTagItem.mainBackGround
    this.mainBackGroundHover = cSegmentedTagItem.mainBackGroundHover
    this.mainTextColor = cSegmentedTagItem.mainTextColor
    this.sub1BackGround = cSegmentedTagItem.sub1BackGround
    this.sub1BackGroundHover = cSegmentedTagItem.sub1BackGroundHover
    this.subTextColor = cSegmentedTagItem.subTextColor
    this.sub2BackGround = cSegmentedTagItem.sub2BackGround
    this.sub2BackGroundHover = cSegmentedTagItem.sub2BackGroundHover
  }
}

interface CSegmentedTagItem extends CSelectItem {
  disabled?: boolean
  mainBackGround?: string
  mainBackGroundHover?: string
  mainTextColor?: string
  subTextColor?: string
  sub1BackGround?: string
  sub1BackGroundHover?: string
  sub2BackGround?: string
  sub2BackGroundHover?: string
}
