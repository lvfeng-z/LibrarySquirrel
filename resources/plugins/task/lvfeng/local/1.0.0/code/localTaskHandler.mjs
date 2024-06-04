import fs from 'fs'
import path from 'path'
import { Readable } from 'node:stream'

export default class LocalTaskHandler {
  /**
   * 创建任务过程暂停标识
   */
  createTaskPaused

  /**
   * 创建任务过程的阻塞器
   */
  createTaskBlocker

  /**
   * 创建任务过程的阻塞器的resolve函数
   */
  createTaskResume

  constructor() {
    this.createTaskPaused = false
    this.createTaskBlocker = new Promise(resolve => this.createTaskResume = resolve)
  }

  /**
   * 创建任务
   * @param url 需解析的url
   * @return 根据解析结果创建的任务数组
   */
  async create(url) {
    url = url.replace(/^file:\/\//, '')

    const self = this

    const stream = new Readable({
      async read() {
        for await (const task of self.createTaskIteratively(url)) {
          if (this.createTaskPaused) {
            await this.createTaskBlocker
          }
          const taskData = JSON.stringify(task)
          if (this.createTaskPaused) {
            await this.createTaskBlocker
          }
          this.push(Buffer.from(taskData))
        }
        this.push(null)
      }
    })
    stream.on('resume', () => {
      this.createTaskResume()
      this.createTaskBlocker = new Promise(resolve => this.createTaskResume = resolve)
      this.createTaskPaused = false
    })
    stream.on('pause', () => {
      this.createTaskPaused = true
    })
    return stream
  }

  /**
   * 开始任务
   * @param task 需开始的任务数组
   * @return 作品信息
   */
  async start(task) {
    const worksDTO = new WorksDTO()
    const stats = await fs.promises.stat(task.url)
    worksDTO.filenameExtension = path.parse(task.url).ext
    worksDTO.siteWorksName = ''
    worksDTO.siteWorkDescription = ''
    worksDTO.includeTaskId = task.id
    // 异步读取文件
    worksDTO.resourceStream = fs.createReadStream(task.url)
    worksDTO.resourceSize = stats.size
    return worksDTO
  }

  /**
   * 重试下载任务
   * @param tasks 需要重试的任务
   * @return 作品信息
   */
  retry(tasks) {

  }

  /**
   * 迭代目录创建任务
   * @param dir 目录
   * @return {AsyncGenerator<*, void, *>}
   */
  async* createTaskIteratively(dir) {
    const stack = [dir] // 初始任务放入栈中
    const tasks = [] // 用于收集所有生成的任务

    while (stack.length > 0) {
      if (this.createTaskPaused) {
        await this.createTaskBlocker
      }
      const dir = stack.pop() // 获取并移除栈顶元素
      try {
        const stats = await fs.promises.stat(dir)
        if (stats.isDirectory()) {
          // 如果是目录，则获取子项并按相反顺序压入栈中（保证左子树先遍历）
          const entries = await fs.promises.readdir(dir, { withFileTypes: true })
          for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i]
            stack.push(path.join(dir, entry.name))
          }
        } else {
          // 如果是文件，则创建任务并加入列表
          const task = new Task()
          task.url = dir
          task.taskName = path.parse(dir).base
          tasks.push(task)
        }
      } catch (err) {
        console.error(`Error reading ${dir}: ${err}`)
      }
    }
    // 使用生成器函数来逐个yield生成的任务，模拟异步迭代器行为
    for (const task of tasks) {
      if (this.createTaskPaused) {
        await this.createTaskBlocker
      }
      yield task
    }
  }
}

class WorksDTO {
  filePath
  filenameExtension
  workdir
  siteId
  siteWorksId
  siteWorksName
  siteAuthorId
  siteWorkDescription
  siteUploadTime
  siteUpdateTime
  nickName
  localAuthorId
  includeTime
  includeMode
  includeTaskId
  resourceStream
  resourceSize

  constructor() {
    this.filePath = undefined
    this.filenameExtension = undefined
    this.workdir = undefined
    this.worksType = undefined
    this.siteId = undefined
    this.siteWorksId = undefined
    this.siteWorksName = undefined
    this.siteAuthorId = undefined
    this.siteWorkDescription = undefined
    this.siteUploadTime = undefined
    this.siteUpdateTime = undefined
    this.nickName = undefined
    this.localAuthorId = undefined
    this.includeTime = undefined
    this.includeMode = undefined
    this.includeTaskId = undefined
    this.downloadStatus = undefined
    this.author = undefined
    this.siteTags = undefined
    this.resourceStream = undefined
    this.resourceSize = undefined
  }
}

class Task {
  isCollection
  parentId
  taskName
  siteDomain
  localWorksId
  siteWorksId
  url
  status
  pluginId
  pluginInfo
  pluginData

  constructor() {
    this.isCollection = undefined
    this.parentId = undefined
    this.taskName = undefined
    this.siteDomain = undefined
    this.localWorksId = undefined
    this.siteWorksId = undefined
    this.url = undefined
    this.status = undefined
    this.pluginId = undefined
    this.pluginInfo = undefined
    this.pluginData = undefined
  }
}
