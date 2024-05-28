import fs from 'fs'
import { join } from 'path'

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

  async *createFileStream(dirPath) {
    const queue = [];
    const streamQueueLimit = 10;

    async function* readFilesRecursively(dir) {
      const files = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = join(dir, file.name);
        if (file.isDirectory()) {
          yield* readFilesRecursively(filePath);
        } else {
          yield filePath;
        }
      }
    }

    for await (const filePath of readFilesRecursively(dirPath)) {
      // 控制队列长度
      if(queue.length >= streamQueueLimit) {
        await new Promise(resolve => setTimeout(resolve, 10)); // 简单的延时等待，确保不会无限制增加队列
      }
      queue.push(fs.createReadStream(filePath, 'utf8'));
      yield queue.shift(); // 开始发送队列中的第一个流
    }
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
