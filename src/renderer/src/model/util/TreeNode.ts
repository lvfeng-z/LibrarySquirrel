import { notNullish } from '../../utils/CommonUtil'

/**
 * 树节点
 */
export default class TreeNode<T extends TreeNode<T>> {
  value: string | number | null | undefined
  label: string | null | undefined
  children: T[] | null | undefined
  constructor(treeNode?: TreeNode<T>) {
    if (treeNode === undefined) {
      this.value = undefined
      this.label = undefined
      this.children = undefined
    } else {
      this.value = treeNode.value
      this.label = treeNode.label
      this.children = treeNode.children
    }
  }

  /**
   * 按照value递归查询节点
   * @param value
   */
  getNode(value: string | number): this | undefined {
    if (this.value === value) {
      return this
    }
    if (notNullish(this.children) && this.children.length > 0) {
      for (let index = this.children.length - 1; index >= 0; index--) {
        let target
        for (let childIndex = this.children.length - 1; childIndex >= 0; childIndex--) {
          target = this.children[childIndex].getNode(value)
          if (target !== undefined) {
            return target
          }
        }
      }
    }
    return undefined
  }
}
