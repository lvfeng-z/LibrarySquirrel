import TreeNode from '../model/util/TreeNode'
import { NotNullish } from './CommonUtil'

/**
 * 递归创建树形列表
 * @param data 树节点
 * @param pid 父母节点id
 */
export function BuildTree<T extends TreeNode>(data: T[], pid: string | number | null | undefined): T[] {
  // 遍历列表，收集所有子节点
  const tree: T[] = [...data.filter((node) => node.pid === pid)]

  // 递归每一个子节点的子节点
  tree.forEach((node) => {
    node.children = BuildTree(data, node.id)
  })

  return tree
}

/**
 * 按照value递归查询节点
 * @param root
 * @param id
 */
export function GetNode<T extends TreeNode>(root: T, id: string | number): T | undefined {
  if (root.id === id) {
    return root
  }
  if (NotNullish(root.children) && root.children.length > 0) {
    for (let index = root.children.length - 1; index >= 0; index--) {
      let target
      for (let childIndex = root.children.length - 1; childIndex >= 0; childIndex--) {
        target = GetNode(root.children[childIndex], id)
        if (target !== undefined) {
          return target
        }
      }
    }
  }
  return undefined
}
