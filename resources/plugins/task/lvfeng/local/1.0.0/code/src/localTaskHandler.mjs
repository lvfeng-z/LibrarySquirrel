import fs from 'fs'
import path from 'path'
import { Readable } from 'node:stream'
import lodash from 'lodash-es'

export default class LocalTaskHandler {
  pluginTool

  constructor(pluginTool) {
    this.pluginTool = pluginTool
  }

  /**
   * 创建任务
   * @param url 需解析的url
   * @return 根据解析结果创建的任务数组
   */
  async create(url) {
    url = url.replace(/^file:\/\//, '')
    return new TaskStream(url, this.pluginTool)
  }

  /**
   * 开始任务
   * @param task 需开始的任务数组
   * @return 作品信息
   */
  async start(task) {
    // 保存在pluginData的数据
    const pluginData = JSON.parse(task.pluginData)
    // 含义列表
    const meaningOfPaths = pluginData.meaningOfPaths
    // 文件名
    const filename = path.parse(task.url).name
    // 扩展名
    const filenameExtension = path.parse(task.url).ext
    // 其他文件信息
    const stats = await fs.promises.stat(task.url)

    const worksDTO = new WorksDTO()
    // 处理扩展名
    worksDTO.filenameExtension = filenameExtension

    // 处理pluginData里的信息
    // 处理作品集
    const worksSets = this.getDataFromMeaningOfPath(meaningOfPaths, 'worksSetName')
    if (worksSets.length > 0) {
      const worksSet = new WorksSet()
      worksSet.siteWorksSetName = worksSets[0].name
      worksSet.siteWorksSetId = worksSets[0].details.siteWorksSetId
      worksDTO.worksSet = worksSet
    }
    // 处理作品名称
    const worksNames = this.getDataFromMeaningOfPath(meaningOfPaths, 'worksName')
    // 如果pluginData里保存的用户解释含义中包含worksName，则使用worksName，否则使用文件名
    if (worksNames.length > 0) {
      worksDTO.siteWorksName = worksNames[0].name
    } else {
      worksDTO.siteWorksName = filename
    }
    // 处理标签
    const tagInfos = this.getDataFromMeaningOfPath(meaningOfPaths, 'tag')
    worksDTO.localTags = tagInfos.map(tagInfo => tagInfo.details)
    // 处理作者信息
    const authors = this.getDataFromMeaningOfPath(meaningOfPaths, 'author')
    worksDTO.localAuthors = authors.map(authorInfo => authorInfo.details)

    // 处理任务id
    worksDTO.includeTaskId = task.id
    // 处理资源
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
   * 在含义列表中查找对应类型的含义
   * @param meaningOfPaths 含义列表
   * @param type 类型
   * @return {*}
   */
  getDataFromMeaningOfPath(meaningOfPaths, type) {
    return meaningOfPaths.filter(meaningOfPath => meaningOfPath.type === type)
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

  /**
   * 计数器（用于给作品集设置唯一标识）
   */
  counter

  constructor(directoryPath, pluginTool) {
    super({ objectMode: true, highWaterMark: 1 });
    this.directoryPath = directoryPath
    this.stack = [{ dir: this.directoryPath, meaningOfPaths: [] }]
    this.pluginTool = pluginTool
    this.counter = 0
    this._read = this._read.bind(this)
  }

  async _read(size) {
    this.counter++
    let bufferFilled = false
    // 迭代到路径指向文件或者栈为空为止
    while (!bufferFilled) {
      // 获取并移除栈顶元素
      const dirInfo = this.stack.pop()
      const dir = dirInfo.dir
      try {
        const stats = await fs.promises.stat(dir)

        if (stats.isDirectory()) {
          // 请求用户解释目录含义
          const waitUserInput = this.pluginTool.explainPath(dir)
          const meaningOfPaths = await waitUserInput
          // 如果含义是作品集
          meaningOfPaths.forEach(meaningOfPath => {
            if (meaningOfPath.type === 'worksSetName') {
              meaningOfPath.details = { siteWorksSetId: dir }
            }
          })
          // 将获得的目录含义并入从上级目录继承的含义数组中
          dirInfo.meaningOfPaths = [...dirInfo.meaningOfPaths, ...meaningOfPaths]

          // 如果是目录，则获取子项并按相反顺序压入栈中（保证左子树先遍历）
          const entries = await fs.promises.readdir(dir, { withFileTypes: true })
          for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i]
            // 把下级目录放进栈的同时，将自身的含义传给下级目录
            const childDir = path.join(dir, entry.name)
            const childMeaningOfPaths = lodash.cloneDeep(dirInfo.meaningOfPaths)
            const childInfo = lodash.cloneDeep({ dir: childDir, meaningOfPaths: childMeaningOfPaths })
            this.stack.push(childInfo)
          }
        } else {
          // 如果是文件，则创建任务并加入列表
          const task = new Task()
          task.url = dir
          task.taskName = path.parse(dir).base
          task.pluginData = { meaningOfPaths: dirInfo.meaningOfPaths }
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

class WorksDTO {
  /**
   * 作品来源站点id
   */
  siteId
  /**
   * 站点中作品的id
   */
  siteWorksId
  /**
   * 站点中作品的名称
   */
  siteWorksName
  /**
   * 站点中作品的作者id
   */
  siteAuthorId
  /**
   * 站点中作品的描述
   */
  siteWorkDescription
  /**
   * 站点中作品的上传时间
   */
  siteUploadTime
  /**
   * 站点中作品最后修改的时间
   */
  siteUpdateTime
  /**
   * 作品别称
   */
  nickName
  /**
   * 作品所属作品集
   */
  worksSet
  /**
   * 收录方式（0：本地导入，1：站点下载）
   */
  includeMode
  /**
   * 收录任务id
   */
  includeTaskId
  /**
   * 本地作者
   */
  localAuthors
  /**
   * 本地标签数组
   */
  localTags
  /**
   * 站点作者
   */
  siteAuthors
  /**
   * 站点标签数组
   */
  siteTags
  /**
   * 作品资源的数据流
   */
  resourceStream
  /**
   * 作品资源的文件大小，单位：字节（Bytes）
   */
  resourceSize

  constructor() {
    this.siteId = undefined
    this.siteWorksId = undefined
    this.siteWorksName = undefined
    this.siteAuthorId = undefined
    this.siteWorkDescription = undefined
    this.siteUploadTime = undefined
    this.siteUpdateTime = undefined
    this.nickName = undefined
    this.includeMode = undefined
    this.includeTaskId = undefined
    this.localAuthors = undefined
    this.localTags = undefined
    this.siteAuthors = undefined
    this.siteTags = undefined
    this.resourceStream = undefined
    this.resourceSize = undefined
  }
}

class WorksSet {
  /**
   * 主键
   */
  id
  /**
   * 集合来源站点id
   */
  siteId
  /**
   * 集合在站点的id
   */
  siteWorksSetId
  /**
   * 集合在站点的名称
   */
  siteWorksSetName
  /**
   * 集合在站点的作者id
   */
  siteAuthorId
  /**
   * 集合在站点的上传时间
   */
  siteUploadTime
  /**
   * 集合在站点最后更新的时间
   */
  siteUpdateTime
  /**
   * 别名
   */
  nickName

  constructor() {
    this.id = undefined
    this.siteId = undefined
    this.siteWorksSetId = undefined
    this.siteWorksSetName = undefined
    this.siteAuthorId = undefined
    this.siteUploadTime = undefined
    this.siteUpdateTime = undefined
    this.nickName = undefined
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
