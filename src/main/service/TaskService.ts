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

  // 读取配置
  const pluginId = global.settings.get(`plugins.task.${task.siteId}`)

  // 查询插件信息，日志用
  const pluginInfo = JSON.stringify(await InstalledPluginsService.getById(pluginId))

  const pluginLoader = new PluginLoader()
  return pluginLoader.loadTaskPlugin(pluginId).then(async (taskHandler: TaskHandler) => {
    try {
      const worksDTOs = await taskHandler.start(tasks)
      // 记录任务id，用于校验插件返回的任务id是否越界
      const taskIds = tasks.map((task) => task.id)

      const settings = SettingsService.getSettings() as { workdir: string }

      let i = 0
      for (const worksDTO of worksDTOs) {
        // 如果插件未返回任务id，发出警告并跳过此次循环
        if (
          Object.prototype.hasOwnProperty.call(worksDTO, 'includeTaskId') &&
          worksDTO.includeTaskId !== undefined &&
          worksDTO.includeTaskId !== null
        ) {
          // 如果插件返回的任务id越界，发出警告并跳过此次循环
          if (!taskIds.includes(worksDTO.includeTaskId)) {
            LogUtil.warn(
              'TaskService',
              `插件返回的任务id越界，taskId: ${worksDTO.includeTaskId}，plugin: ${pluginInfo}`
            )
            continue
          }
        } else {
          LogUtil.warn('TaskService', `插件未返回任务的id，plugin: ${pluginInfo}`)
          continue
        }

        // 如果插件返回了任务资源，将资源保存至本地，否则发出警告
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
          taskFailed(worksDTO.includeTaskId as number)
          LogUtil.warn(
            'TaskService',
            `插件未返回任务的资源，taskId: ${worksDTO.includeTaskId}，plugin: ${pluginInfo}`
          )
        }
      }
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
