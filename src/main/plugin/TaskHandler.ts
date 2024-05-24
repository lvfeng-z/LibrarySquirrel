import Task from '../model/Task.ts'

export default interface TaskHandler {
  /**
   * 创建任务
   * @return 下载的资源
   */
  create(task: Task): Promise<Task[]>

  /**
   * 开始任务
   * @return 下载的资源
   */
  start(task: Task): Promise<Buffer>
}
