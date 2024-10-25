import TaskService from '../service/TaskService.js'
import { assertNotNullish } from '../util/AssertUtil.js'
import TaskWriter from '../util/TaskWriter.js'
import { TaskStatusEnum } from '../constant/TaskStatusEnum.js'
import LogUtil from '../util/LogUtil.js'
import TaskDTO from '../model/dto/TaskDTO.js'
import { GlobalVar, GlobalVars } from '../global/GlobalVar.js'
import PluginLoader from '../plugin/PluginLoader.js'
import { TaskHandlerFactory } from '../plugin/TaskHandler.js'
import { parentPort, workerData } from 'worker_threads'

if (!parentPort) {
  throw new Error('parentPort must be a parent port')
}
const port = parentPort

port.on('message', async () => {
  try {
    const tasks: TaskDTO[] = workerData
    console.log(tasks)
    const taskQueue = GlobalVar.get(GlobalVars.TASK_QUEUE)
    // const taskService = new TaskService()
    // const pluginLoader = new PluginLoader(new TaskHandlerFactory())
    // const childProcesses: Promise<boolean>[] = []
    // for (const task of tasks) {
    //   assertNotNullish(task.id)
    //   taskQueue.push(task.id, new TaskWriter())
    //
    //   const activeProcess = taskService
    //     .processTask(task, pluginLoader)
    //     .then(async (processResult) => {
    //       if (TaskStatusEnum.FINISHED === processResult.status) {
    //         task.status = TaskStatusEnum.FINISHED
    //       }
    //       return true
    //     })
    //     .catch(async (error) => {
    //       LogUtil.error('TaskService', `保存任务时出错，taskId: ${task.id}，error: `, error)
    //       task.status = TaskStatusEnum.FAILED
    //       return taskService.taskFailed(task.id).then(() => false)
    //     })
    //   childProcesses.push(activeProcess)
    // }
    //
    // Promise.allSettled(childProcesses)
    //   .then(() => port.postMessage({ success: true }))
    //   .catch((error) => port.postMessage({ success: false, error: error }))
    //   .finally(() => {
    //     process.exit()
    //   })
  } catch (error) {
    port.postMessage({ success: false, error: error })
  }
})
