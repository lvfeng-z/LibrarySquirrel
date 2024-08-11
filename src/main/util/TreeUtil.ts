import TreeNode from '../model/utilModels/TreeNode.ts'

/**
 * 递归创建树形列表
 * @param data 树节点
 * @param pid 父母节点id
 */
export function buildTree<T extends TreeNode<T>>(
  data: T[],
  pid: string | number | null | undefined
): T[] {
  // 遍历列表，收集所有子节点
  const tree: T[] = [...data.filter((node) => node.pid === pid)]

  // 递归每一个子节点的子节点
  tree.forEach((node) => {
    node.children = buildTree(data, node.id)
  })

  return tree
}
