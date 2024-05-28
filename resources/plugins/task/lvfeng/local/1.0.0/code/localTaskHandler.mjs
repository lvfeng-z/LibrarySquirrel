import fs from 'fs'
import { join } from 'path'

export default class LocalTaskHandler {
  constructor() {}

  async *create(url) {
    url = url.replace(/^file:\/\//, '')

    async function* readFilesRecursively(task) {
      const files = await fs.promises.readdir(task.url, { withFileTypes: true });
      for (const file of files) {
        const newTask = new Task()
        newTask.url = join(task.url, file.name);
        console.log(newTask);
        if (file.isDirectory()) {
          yield* readFilesRecursively(newTask);
        } else {
          yield newTask;
        }
      }
    }

    const task = new Task()
    task.url = url

    for await (const ta of readFilesRecursively(task)) {
      yield ta
    }
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

  // async *taskGenerator(dirPath) {
  //
  //   async function* readFilesRecursively(task) {
  //     const files = await fs.promises.readdir(task.url, { withFileTypes: true });
  //     for (const file of files) {
  //       const newTask = new Task()
  //       newTask.url = join(task.url, file.name);
  //       console.log(newTask);
  //       if (file.isDirectory()) {
  //         yield* readFilesRecursively(newTask);
  //       } else {
  //         yield newTask;
  //       }
  //     }
  //   }
  //
  //   const task = new Task()
  //   task.url = dirPath
  //
  //   for await (const ta of readFilesRecursively(task)) {
  //     yield ta
  //   }
  // }

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

class Task {
  isCollection
  parentId
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
