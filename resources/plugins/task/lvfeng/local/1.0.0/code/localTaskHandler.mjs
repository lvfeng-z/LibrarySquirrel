import fs from 'fs'

export default class LocalTaskHandler {
  constructor() {}

  create(url) {
    const task1 = this.createTask()
    task1.url = 'zh.jpg'
    const task2 = this.createTask()
    task2.url = 'lt.mp4'
    return [task1, task2]
  }

  async start(tasks) {
    const worksDTOs = []
    tasks.forEach((task) => {
      const worksDTO = this.createWorksDTO()
      worksDTO.siteWorksName = ''
      worksDTO.siteWorkDescription = ''
      worksDTO.includeTaskId = task.id
      // 异步读取文件
      worksDTO.resourceStream = fs.createReadStream(task.url)
      worksDTOs.push(worksDTO)
    })
    return worksDTOs
  }

  retry() {

  }

  createTask(){
    return {
      isCollection: undefined,
      parentId: undefined,
      siteDomain: undefined,
      localWorksId: undefined,
      siteWorksId: undefined,
      url: undefined,
      status: undefined,
      pluginId: undefined,
      pluginInfo: undefined,
      pluginData: undefined
    }
  }

  createWorksDTO() {
    return {
      filePath: undefined,
      workdir: undefined,
      worksType: undefined,
      siteId: undefined,
      siteWorksId: undefined,
      siteWorksName: undefined,
      siteAuthorId: undefined,
      siteWorkDescription: undefined,
      siteUploadTime: undefined,
      siteUpdateTime: undefined,
      nickName: undefined,
      localAuthorId: undefined,
      includeTime: undefined,
      includeMode: undefined,
      includeTaskId: undefined,
      downloadStatus: undefined,
      author: undefined,
      siteTags: undefined,
      resourceStream: undefined
    }
  }
}
