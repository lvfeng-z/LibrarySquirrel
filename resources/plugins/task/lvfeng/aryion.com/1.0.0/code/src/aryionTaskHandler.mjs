import { Readable } from 'node:stream'
import axios from 'axios'
import * as fs from 'node:fs'

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
    const response = await axios.head(task.url)

    // 获取响应头的一些信息
    // 文件大小
    worksDTO.resourceSize = response.headers.get('content-length')
    // 扩展名
    const fileType = response.headers.get('content-type')
    switch (fileType) {
      case 'video/mp4':
        worksDTO.filenameExtension = '.mp4'
        break
    }
    // 建议名称
    const contentDisposition = response.headers.get('content-disposition')
    if (contentDisposition) {
      // 使用正则表达式匹配 'filename' 或 'filename*' 参数
      const regex = /filename=["']?([^"'\s]+)["']?|filename\*=UTF-8''([^\s]+)/
      const match = contentDisposition.match(regex)

      if (match && match[1] || match[2]) {
        // 提取文件名
        worksDTO.suggestedName = match[1] || decodeURIComponent(match[2])
      }
    }

    const config = {
      url: task.url,
      responseType: 'stream',
      headers: {
        Range: `bytes=${0}-`
      }
    }

    const stream = await axios.request(config)

    worksDTO.resourceStream = stream.data

    // 添加暂停和恢复的控制逻辑
    // process.on('SIGINT', () => {
    //   if (!downloadPaused) {
    //     pauseDownload(stream, writerStream);
    //   } else {
    //     resumeDownload(stream, writerStream);
    //   }
    // });
    return worksDTO
  }

  /**
   * 开始任务
   * @param task 需开始的任务数组
   * @return 作品信息
   */
  async fetchStart(task) {
    const worksDTO = new WorksDTO()
    const response = await fetch(task.url)

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`)
    }

    // 获取响应头的一些信息
    // 文件大小
    worksDTO.resourceSize = response.headers.get('content-length')
    // 扩展名
    const fileType = response.headers.get('content-type')
    switch (fileType) {
      case 'video/mp4':
        worksDTO.filenameExtension = '.mp4'
        break
    }
    // 建议名称
    const contentDisposition = response.headers.get('content-disposition')
    if (contentDisposition) {
      // 使用正则表达式匹配 'filename' 或 'filename*' 参数
      const regex = /filename=["']?([^"'\s]+)["']?|filename\*=UTF-8''([^\s]+)/;
      const match = contentDisposition.match(regex);

      if (match && match[1] || match[2]) {
        // 提取文件名
        worksDTO.suggestedName = match[1] || decodeURIComponent(match[2])
      }
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
  pause(task) {
    task.remoteStream.data.pause()
  }

  /**
   * 恢复下载任务
   * @param task 需要恢复的任务
   * @return 作品信息
   */
  resume(task) {
    const downloadedBytes = fs.statSync(task.pendingDownloadPath).size
    task.remoteStream.data.resume()
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
   * 建议名称
   */
  suggestedName
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
    this.suggestedName = undefined
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
  /**
   * 下载中的文件路径
   */
  pendingDownloadPath
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
    this.pendingDownloadPath = undefined
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
