import TaskTreeDTO from './TaskTreeDTO.js'
import { NotNullish } from '../../util/CommonUtil.js'
import lodash from 'lodash'
import TreeNode from '../util/TreeNode.js'
import TaskProgressDTO from './TaskProgressDTO.js'
import Task from '../entity/Task.js'

export default class TaskProgressTreeDTO extends TaskProgressDTO implements TreeNode {
  /**
   * 子任务（用于el-table的树形数据回显）
   */
  children: TaskTreeDTO[] | undefined | null

  /**
   * 是否有子任务（用于el-table的树形数据回显）
   */
  hasChildren: boolean | undefined | null

  /**
   * 是否为叶子节点
   */
  isLeaf: boolean | undefined | null

  constructor(taskProcessingDTO?: TaskProgressDTO | Task) {
    super(taskProcessingDTO)
    if (NotNullish(taskProcessingDTO)) {
      lodash.assign(this, lodash.pick(taskProcessingDTO, ['children', 'hasChildren', 'isLeaf']))
    }
  }
}
