import TreeNode from './TreeNode'

/**
 * 树形选择框选项
 */
export default class TreeSelectNode extends TreeNode<TreeSelectNode> {
  children: TreeSelectNode[] | null | undefined
  secondaryLabel: string | null | undefined
  extraData: object | null | undefined
  disabled: boolean
  constructor(treeSelectNode?: TreeSelectNode) {
    if (treeSelectNode === undefined) {
      super()
      this.children = undefined
      this.secondaryLabel = undefined
      this.extraData = undefined
      this.disabled = false
    } else {
      super(treeSelectNode)
      this.children = treeSelectNode.children?.map((child) => new TreeSelectNode(child))
      this.secondaryLabel = treeSelectNode.secondaryLabel
      this.extraData = treeSelectNode.extraData
      this.disabled = treeSelectNode.disabled
    }
  }
}
