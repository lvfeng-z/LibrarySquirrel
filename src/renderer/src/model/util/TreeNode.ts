/**
 * 树节点
 */
export default interface TreeNode<T> {
  id: string | number | undefined | null
  pid: string | number | undefined | null
  children: T[] | undefined | null
}
