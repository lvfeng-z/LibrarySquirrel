import { Readable } from 'node:stream'

export default class AryionTaskHandler {
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
    // 修改任务集的名称
    this.pluginTool.changeCollectionName(`从【${url}】创建的任务`)

    // 创建任务列表
    const task = new Task()
    task.url = url
    task.taskName = url
    return [task]
  }

  /**
   * 开始任务
   * @param task 需开始的任务数组
   * @return 作品信息
   */
  async start(task) {
    const worksDTO = new WorksDTO()
    const response = await fetch(task.url)

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`)
    }

    // 创建一个 ReadableStream
    const readableStream = response.body

    // 将 ReadableStream 转换成一个可迭代对象
    const iterable = {
      [Symbol.asyncIterator]: async function* () {
        const reader = readableStream.getReader()
        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) return
            yield value
          }
        } finally {
          reader.releaseLock()
        }
      }
    }

    worksDTO.resourceStream = Readable.from(iterable[Symbol.asyncIterator]())

    // // 监听 'finish' 事件来知道下载何时完成
    // worksDTO.resourceStream.on('finish', () => {
    //   console.log('Download completed.');
    // });
    //
    // // 监听 'error' 事件来处理错误
    // worksDTO.resourceStream.on('error', (err) => {
    //   console.error('Error occurred during download:', err);
    // });
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
   * 暂停下载任务
   * @param task 需要暂停的任务
   * @return 作品信息
   */
  pause(task) {}

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
  worksSets
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
  pid
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
    this.pid = undefined
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

class PathTypeEnum {
  static AUTHOR = 0
  static TAG = 1
  static WORKS_NAME = 2
  static WORKS_SET_NAME = 3
  static SITE = 4
  static CREATE_TIME = 5
  static UNKNOWN = 6
}
