import { Readable } from 'node:stream'
import { FileSaveResult } from '../constant/FileSaveResult.js'
import LogUtil from './LogUtil.js'
import { assertNotNullish } from './AssertUtil.js'
import { isNullish, notNullish } from './CommonUtil.js'
import fs from 'fs'

export default class TaskWriter {
  /**
   * 读取流
   */
  public readable: Readable | undefined
  /**
   * 写入流
   */
  public writable: fs.WriteStream | undefined
  /**
   * 资源大小
   */
  public bytesSum: number
  /**
   * 已写入的数据量（只在任务暂停时更新，用于解决恢复任务时首次查询到的进度为0的问题）
   */
  public bytesWritten: number
  /**
   * 是否暂停
   * @private
   */
  private paused: boolean
  /**
   * 读取流是否已完成
   * @private
   */
  private readableFinished: boolean

  constructor(readable?: Readable, writeable?: fs.WriteStream) {
    this.readable = readable
    this.writable = writeable
    this.bytesSum = 0
    this.bytesWritten = 0
    this.paused = false
    this.readableFinished = false
  }

  /**
   * 写入文件
   */
  public doWrite(newWritable?: fs.WriteStream): Promise<FileSaveResult> {
    this.paused = false
    return new Promise((resolve, reject) => {
      if (notNullish(newWritable)) {
        this.writable = newWritable
      }
      assertNotNullish(this.readable, 'FileWriter', '写入文件时readable为空')
      assertNotNullish(this.writable, 'FileWriter', '写入文件时writable为空')
      const readable = this.readable
      const writable = this.writable
      let errorOccurred = false
      const readableErrorHandler = (err: Error) => {
        errorOccurred = true
        LogUtil.error('WorksService', `readable出错${err}`)
        reject(err)
      }
      const readableEndHandler = () => {
        this.readableFinished = true
        if (!errorOccurred) {
          writable.end()
        } else {
          reject()
        }
      }
      readable.once('error', readableErrorHandler)
      writable.once('error', (err) => {
        errorOccurred = true
        LogUtil.error('WorksService', `writable出错${err}`)
        reject(err)
      })
      readable.once('end', readableEndHandler)
      readable.once('pause', () => {
        readable.removeListener('error', readableErrorHandler)
        readable.removeListener('end', readableEndHandler)
      })
      writable.once('finish', () => {
        if (!errorOccurred) {
          return this.paused ? resolve(FileSaveResult.PAUSE) : resolve(FileSaveResult.FINISH)
        } else {
          reject()
        }
      })
      readable.pipe(writable)
    })
  }

  /**
   * 暂停下载
   */
  public pause() {
    if (!this.readableFinished) {
      this.paused = true
      if (notNullish(this.readable)) {
        this.readable.unpipe(this.writable)
      }
      if (notNullish(this.writable)) {
        this.writable.end()
        this.bytesWritten = isNullish(this.writable) ? 0 : this.writable.bytesWritten
      }
    }
  }
}
