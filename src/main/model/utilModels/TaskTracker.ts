import { Readable } from 'node:stream'
import fs from 'fs'

export interface TaskTracker {
  /**
   * 任务状态
   */
  status: number
  /**
   * 资源流
   */
  readStream: Readable | undefined
  /**
   * 写入流
   */
  writeStream: fs.WriteStream | undefined
  /**
   * 资源大小
   */
  bytesSum: number
  /**
   * 已写入的数据量（只在任务暂停时更新，用于解决恢复任务时首次查询到的进度为0的问题）
   */
  bytesWritten?: number
}
