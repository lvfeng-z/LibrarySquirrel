import fs from 'fs'

export default class PixivTaskHandler {
  constructor() {
  }

  create(url) {

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
