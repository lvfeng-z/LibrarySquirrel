import { TaskStatesEnum } from '../../constant/TaskStatesEnum.js'

/**
 * 保存作品资源的响应
 */
export default interface WorksResourceSaveResponse {
  status: TaskStatesEnum
  worksId: number
}
