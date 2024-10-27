import { TaskStatusEnum } from '../../constant/TaskStatusEnum.js'

/**
 * 保存任务的响应
 */
export default interface taskSaveResult {
  status: TaskStatusEnum
  worksId: number
}
