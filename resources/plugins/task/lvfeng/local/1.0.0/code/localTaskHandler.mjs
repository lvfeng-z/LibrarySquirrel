import fs from 'fs'
import path from 'path'
import { Readable } from 'node:stream'

export default class LocalTaskHandler {
  explainPath

  constructor(explainPath) {
    this.explainPath = explainPath
  }

  /**
   * 创建任务
   * @param url 需解析的url
   * @return 根据解析结果创建的任务数组
   */
  async create(url) {
    url = url.replace(/^file:\/\//, '')
    return new TaskStream(url, this.explainPath)
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

class TaskStream extends Readable{
  /**
   * 基础路径
   */
  directoryPath

  /**
   * 迭代栈
   */
  stack

  /**
   * 插件工具
   */
  pluginTool

  constructor(directoryPath, pluginTool) {
    super({ objectMode: true, highWaterMark: 1 });
    this.directoryPath = directoryPath
    this.stack = [this.directoryPath]
    this.pluginTool = pluginTool
    this._read = this._read.bind(this)
  }

  async _read(size) {
      let bufferFilled = false
      // 迭代到路径指向文件或者栈为空为止
      while (!bufferFilled) {
        // 获取并移除栈顶元素
        const dir = this.stack.pop()
        try {
        const stats = await fs.promises.stat(dir)

        if (stats.isDirectory()) {
          const waitUserInput = this.pluginTool.explainPath(dir)
          const meaningOfPath = await waitUserInput
          console.log(meaningOfPath)
          // 如果是目录，则获取子项并按相反顺序压入栈中（保证左子树先遍历）
          const entries = await fs.promises.readdir(dir, { withFileTypes: true })
          for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i]
            this.stack.push(path.join(dir, entry.name))
          }
        } else {
          // 如果是文件，则创建任务并加入列表
          const task = new Task()
          task.url = dir
          task.taskName = path.parse(dir).base
          this.push(task)
          bufferFilled = true

          if(this.stack.length === 0) {
            this.push(null)
            bufferFilled = true
          }
        }
      } catch (err) {
        console.error(`Error reading ${dir}: ${err}`)
        // 停止流
        this.emit('error', err)
      }
    }
  }
}
