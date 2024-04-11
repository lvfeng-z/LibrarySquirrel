/**
 * 下拉选择框选项
 */
export default class SelectVO {
  value: string | null | undefined
  label: string | null | undefined
  rootId: string | null | undefined
  extraData: object | null | undefined
  constructor(selectVO: SelectVO) {
    this.value = selectVO.value
    this.label = selectVO.label
    this.rootId = selectVO.rootId
    this.extraData = selectVO.extraData
  }
}
