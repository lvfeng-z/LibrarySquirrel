/**
 * 树节点
 */
export default class TreeNode<T extends TreeNode<T>> {
  id: string | number | undefined
  pid: string | number | undefined
  children: T[]
  constructor(treeNode?: TreeNode<T>) {
    if (treeNode === undefined) {
      this.pid = undefined
      this.children = []
    } else {
      this.pid = treeNode.pid
      this.children = treeNode.children
    }
  }

  /**
   * 递归创建树结构
   * @param data 树节点
   * @param rootPid 根节点id
   */
  buildTree(data: T[], rootPid: string | number | undefined): T[] {
    let tree: T[] = []

    // 遍历列表，收集所有子节点
    tree = [...data.filter((node) => node.pid === rootPid)]

    // 递归每一个子节点的子节点
    tree.forEach((node) => {
      node.children = this.buildTree(data, node.id)
    })

    return tree
  }
}