import { Transform, TransformCallback } from 'node:stream'
import TaskDTO from '../model/dto/TaskDTO.js'
import TaskService from '../service/TaskService.js'
import PluginLoader from '../plugin/PluginLoader.js'
import { TaskHandler } from '../plugin/TaskHandler.js'
import { TaskQueue } from '../global/TaskQueue.js'
import { GlobalVar, GlobalVars } from '../global/GlobalVar.js'
import TaskWriter from './TaskWriter.js'
import { assertNotNullish } from './AssertUtil.js'
import { TaskStatusEnum } from '../constant/TaskStatusEnum.js'

/**
 * 任务处理流
 */
export default class TaskProcessStream extends Transform {
  public tasks: TaskDTO[]
  private taskService: TaskService
  private readonly pluginLoader: PluginLoader<TaskHandler>
  private taskQueue: TaskQueue

  constructor(tasks: TaskDTO[], pluginLoader: PluginLoader<TaskHandler>) {
    super({ objectMode: true }) // 设置为对象模式
    this.tasks = tasks
    this.taskService = new TaskService()
    this.pluginLoader = pluginLoader
    this.taskQueue = GlobalVar.get(GlobalVars.TASK_QUEUE)
  }

  _transform(task: TaskDTO, _encoding: string, callback: TransformCallback): void {
    // 处理任务
    assertNotNullish(task.id)
    this.taskQueue.push(task.id, new TaskWriter())
    this.taskQueue
      .start(task.id, () =>
        this.taskService.processTask(task, this.pluginLoader).then((saveResult) => {
          this.push(saveResult)
          callback()
          return saveResult.status
        })
      )
      .catch((err) => {
        task.status = TaskStatusEnum.FAILED
        this.emit('error', err, task)
        callback()
      })
  }

  public startProcessing() {
    // 将任务列表写入流中，启动处理过程
    this.tasks.forEach((task) => this.write(task))
    this.end() // 标记流的结束
  }
}
