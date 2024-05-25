import Task from '../model/Task.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'

export default interface TaskHandler {
  /**
   * 创建任务
   * @return 下载的资源
   */
  create(url: string): Promise<Task[]>

  /**
   * 开始任务
   * @return 下载的资源
   */
  start(tasks: Task[]): Promise<WorksDTO[]>

  /**
   * 暂停下载任务
   * @param taskIds
   */
  pause(taskIds: number[]): Promise<boolean>

  /**
   * 取消下载任务
   * @param taskIds
   */
  cancel(taskIds: number[]): Promise<boolean>
}
