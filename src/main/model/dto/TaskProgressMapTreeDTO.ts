import lodash from 'lodash'
import { NotNullish } from '../../util/CommonUtil.js'
import TaskProgressDTO from './TaskProgressDTO.js'

export default class TaskProgressMapTreeDTO extends TaskProgressDTO {
  /**
   * 子任务（用于el-table的树形数据回显）
   */
  children: Map<number, TaskProgressMapTreeDTO> | undefined | null

  /**
   * 是否有子任务（用于el-table的树形数据回显）
   */
  hasChildren: boolean | undefined | null

  /**
   * 是否为叶子节点
   */
  isLeaf: boolean | undefined | null

  constructor(task?: TaskProgressDTO) {
    super(task)
    if (NotNullish(task)) {
      lodash.assign(this, lodash.pick(task, ['children', 'hasChildren', 'isLeaf']))
    }
  }
}
