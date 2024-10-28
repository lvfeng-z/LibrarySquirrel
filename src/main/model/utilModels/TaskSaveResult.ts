import { TaskStatusEnum } from '../../constant/TaskStatusEnum.js'

/**
 * 保存任务的响应
 */
export default interface TaskSaveResult {
  status: TaskStatusEnum
  worksId: number
}
