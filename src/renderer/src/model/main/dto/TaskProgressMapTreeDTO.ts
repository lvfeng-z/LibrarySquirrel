import lodash from 'lodash'
import TaskProgressDTO from '@renderer/model/main/dto/TaskProgressDTO.ts'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

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
