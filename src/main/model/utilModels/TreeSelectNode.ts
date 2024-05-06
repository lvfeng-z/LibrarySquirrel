/**
 * 树形选择框选项
 */
export default class TreeSelectNode {
  value: string | null | undefined
  label: string | null | undefined
  secondaryLabel: string | null | undefined
  children: TreeSelectNode | null | undefined
  extraData: object | null | undefined
  constructor(treeSelectVO: TreeSelectNode) {
    this.value = treeSelectVO.value
    this.label = treeSelectVO.label
    this.secondaryLabel = treeSelectVO.secondaryLabel
    this.children = treeSelectVO.children
    this.extraData = treeSelectVO.extraData
  }
}
