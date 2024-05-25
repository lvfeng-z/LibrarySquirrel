import Task from '../model/Task.ts'
import LogUtil from '../util/LogUtil.ts'
import TaskHandler from '../plugin/TaskHandler.ts'
import TaskDao from '../dao/TaskDao.ts'
import fs from 'fs'
import SettingsService from './SettingsService.ts'
import PluginLoader from '../plugin/PluginLoader.ts'
import TaskConstant from '../constant/TaskConstant.ts'
import TaskQueryDTO from '../model/queryDTO/TaskQueryDTO.ts'
import InstalledPluginsService from './InstalledPluginsService.ts'

/**
 * 保存任务
 * @param task
 */
async function save(task: Task): Promise<number> {
  task = new Task(task)
  const dao = new TaskDao()
  return (await dao.save(task)) as number
}

/**
 * 根据传入的url创建任务
 * @param url 作品/作品集所在url
 */
async function createTask(url: string) {
  console.log(url)
  // task = new Task(task)
  // const dao = new TaskDao()
  // return (await dao.save(task)) as number
}

/**
 * 开始任务
 * @param taskId
 */
async function startTask(taskId: number): Promise<boolean> {
  const dao = new TaskDao()
  const task = await dao.getById(taskId)

  if (task === undefined) {
    const msg = `找不到任务，taskId = ${taskId}`
    LogUtil.error('TaskService', msg)
    return false
  }
  if (!Object.prototype.hasOwnProperty.call(task, 'siteId') || task.siteId === 0) {
    const msg = '开始任务时，siteId意外为空'
    LogUtil.error('TaskService', msg, 'task:', task)
    return false
  }

  let tasks: Task[] = []

  if (task.isCollection) {
    tasks = await getChildrenTask(task.id as number)
  }

  const pluginId = global.settings.get(`plugins.task.${task.siteId}`)

  // 查询插件信息，日志用
  const pluginInfo = JSON.stringify(await InstalledPluginsService.getById(pluginId))

  const pluginLoader = new PluginLoader()
  return pluginLoader.loadTaskPlugin(pluginId).then(async (taskHandler: TaskHandler) => {
    try {
      const worksDTOs = await taskHandler.start(tasks)

      const settings = SettingsService.getSettings() as { workdir: string }

      let i = 0
      worksDTOs.forEach((worksDTO) => {
        if (
          Object.prototype.hasOwnProperty.call(worksDTO, 'resourceStream') &&
          worksDTO.resourceStream !== undefined &&
          worksDTO.resourceStream !== null
        ) {
          const writeStream = fs.createWriteStream(`${settings.workdir}/download/test${i}.jpg`)
          worksDTO.resourceStream.pipe(writeStream)

          worksDTO.resourceStream.on('end', () => {
            finishTask(worksDTO.includeTaskId as number)
          })
          worksDTO.resourceStream.on('error', () => {
            taskFailed(worksDTO.includeTaskId as number)
          })
          i++
        } else {
          LogUtil.warn(
            'TaskService',
            `插件未返回任务的资源，taskId: ${worksDTO.includeTaskId}，plugin: ${pluginInfo}`
          )
        }
      })
      return true
    } catch (err) {
      LogUtil.error('TaskService', err)
      return false
    }
  })
}

function getChildrenTask(parentId: number) {
  const dao = new TaskDao()
  const query = new TaskQueryDTO()
  query.parentId = parentId
  return dao.selectList(query)
}

/**
 * 任务完成
 * @param taskId
 */
function finishTask(taskId: number) {
  const dao = new TaskDao()
  const task = new Task()
  task.status = TaskConstant.TaskStatesEnum.finished
  return dao.updateById(taskId, task)
}

/**
 * 任务失败
 * @param taskId
 */
function taskFailed(taskId: number) {
  const dao = new TaskDao()
  const task = new Task()
  task.status = TaskConstant.TaskStatesEnum.failed
  return dao.updateById(taskId, task)
}

export default {
  save,
  createTask,
  startTask
}
