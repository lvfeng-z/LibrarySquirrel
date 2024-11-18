import Task from '../Task.ts'
import TreeNode from '../../util/TreeNode.ts'

/**
 * 任务
 */
export default class TaskDTO extends Task implements TreeNode {
  /**
   * 子任务（用于el-table的树形数据回显）
   */
  children: TaskDTO[] | undefined | null

  /**
   * 是否有子任务（用于el-table的树形数据回显）
   */
  hasChildren: boolean | undefined | null

  constructor(taskDTO?: TaskDTO | Task) {
    if (taskDTO === undefined) {
      super()
      this.children = undefined
      this.hasChildren = undefined
    } else {
      super(taskDTO)
      if (taskDTO instanceof TaskDTO) {
        this.children = taskDTO.children
        this.hasChildren = taskDTO.hasChildren
      } else {
        this.children = undefined
        this.hasChildren = undefined
      }
    }
  }
}
