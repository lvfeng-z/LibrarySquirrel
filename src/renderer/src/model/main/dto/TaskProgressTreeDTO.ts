import TaskTreeDTO from '@renderer/model/main/dto/TaskTreeDTO.ts'
import TaskProgressDTO from '@renderer/model/main/dto/TaskProgressDTO.ts'
import lodash from 'lodash'
import TreeNode from '@renderer/model/util/TreeNode.ts'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

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

  constructor(taskProcessingDTO?: TaskProgressDTO) {
    super(taskProcessingDTO)
    if (NotNullish(taskProcessingDTO)) {
      lodash.assign(this, lodash.pick(taskProcessingDTO, ['children', 'hasChildren', 'isLeaf']))
    }
  }
}
