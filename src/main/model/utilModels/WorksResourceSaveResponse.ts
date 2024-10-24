import { TaskStatusEnum } from '../../constant/TaskStatusEnum.js'

/**
 * 保存作品资源的响应
 */
export default interface WorksResourceSaveResponse {
  status: TaskStatusEnum
  worksId: number
}
