import Task from '../model/Task.ts'
import LogUtil from '../util/LogUtil.ts'
import InstalledPluginsService from './InstalledPluginsService.ts'
import TaskHandler from '../plugin/TaskHandler.ts'
import TaskDao from '../dao/TaskDao.ts'
import fs from 'fs/promises'

async function createTask(task: Task): Promise<number> {
  task = new Task(task)
  const dao = new TaskDao()
  return (await dao.save(task)) as number
}

async function startTask(taskId: number): Promise<boolean> {
  const dao = new TaskDao()
  const task = await dao.getById(taskId)

  if (!Object.prototype.hasOwnProperty.call(task, 'siteId') || task.siteId === 0) {
    const msg = '开始任务时，siteId意外为空'
    LogUtil.error('TaskService', msg, 'task:', task)
    return false
  }

  const pluginId = global.settings.get(`plugins.task.${task.siteId}`)
  const classPath = await InstalledPluginsService.getClassPathById(pluginId)
  return import(classPath).then(async (module) => {
    const taskHandler = new module.default() as TaskHandler
    const data = await taskHandler.start(task)
    try {
      fs.writeFile('C:/Users/Administrator/Downloads/新建文件夹/test.jpg', data)
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  })
}

export default {
  createTask,
  startTask
}
