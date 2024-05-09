import TreeNode from './TreeNode'

/**
 * 树形选择框选项
 */
export default class TreeSelectNode extends TreeNode<TreeSelectNode> {
  value: string | number | null | undefined
  label: string | null | undefined
  secondaryLabel: string | null | undefined
  extraData: object | null | undefined
  constructor(treeSelectNode?: TreeSelectNode) {
    if (treeSelectNode === undefined) {
      super()
      this.value = undefined
      this.label = undefined
      this.secondaryLabel = undefined
      this.extraData = undefined
    } else {
      super(treeSelectNode)
      this.value = treeSelectNode.value
      this.label = treeSelectNode.label
      this.secondaryLabel = treeSelectNode.secondaryLabel
      this.extraData = treeSelectNode.extraData
    }
  }
}
