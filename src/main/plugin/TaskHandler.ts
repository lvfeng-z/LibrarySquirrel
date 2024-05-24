import Task from '../model/Task.ts'

export default interface TaskHandler {
  /**
   * 开始任务
   * @return 下载的资源
   */
  start(task: Task): Promise<Buffer>
}
