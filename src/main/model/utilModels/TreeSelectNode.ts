/**
 * 树形选择框选项
 */
export default class TreeSelectNode {
  value: string | null | undefined
  label: string | null | undefined
  secondaryLabel: string | null | undefined
  children: TreeSelectNode | null | undefined
  extraData: object | null | undefined
  constructor(treeSelectNode: TreeSelectNode) {
    this.value = treeSelectNode.value
    this.label = treeSelectNode.label
    this.secondaryLabel = treeSelectNode.secondaryLabel
    this.children = treeSelectNode.children
    this.extraData = treeSelectNode.extraData
  }
}
