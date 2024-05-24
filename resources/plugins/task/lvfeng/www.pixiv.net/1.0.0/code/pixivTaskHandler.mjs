import fs from 'fs/promises'

export default class PixivTaskHandler {
  constructor() {
  }

  start(task) {
    console.log(task)
     // 异步读取文件
    return fs.readFile('C:/asf.png') // 返回文件
  }
}
