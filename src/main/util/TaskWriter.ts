import { Readable } from 'node:stream'
import { FileSaveResult } from '../constant/FileSaveResult.js'
import LogUtil from './LogUtil.js'
import { AssertNotNullish } from './AssertUtil.js'
import { IsNullish, NotNullish } from './CommonUtil.js'
import fs from 'fs'

export default class TaskWriter {
  /**
   * 资源id
   */
  public resourceId: number
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
  /**
   * 是否错误
   */
  private errorOccurred: boolean
  /**
   * doWrite方法返回的Promise的reject方法
   * @private
   */
  private rejectFunc: ((arg?: unknown) => void) | undefined

  /**
   * 可读流的error事件回调
   * @param err
   * @private
   */
  private readableErrorHandler(err: Error) {
    this.errorOccurred = true
    LogUtil.error('TaskWriter', `readable出错${err}`)
    if (NotNullish(this.rejectFunc)) {
      this.rejectFunc(err)
    }
  }

  /**
   * 可读流的end事件回调
   * @private
   */
  private readableEndHandler() {
    this.readableFinished = true
    if (!this.errorOccurred) {
      this.writable?.end()
    } else {
      if (NotNullish(this.rejectFunc)) {
        this.rejectFunc()
      }
    }
  }

  constructor(readable?: Readable, writeable?: fs.WriteStream) {
    this.readable = readable
    this.writable = writeable
    this.bytesSum = 0
    this.bytesWritten = 0
    this.paused = false
    this.readableFinished = false
    this.resourceId = -1
    this.errorOccurred = false
  }

  /**
   * 写入文件
   */
  public doWrite(newWritable?: fs.WriteStream): Promise<FileSaveResult> {
    this.paused = false
    return new Promise((resolve, reject) => {
      this.rejectFunc = reject
      if (NotNullish(newWritable)) {
        this.writable = newWritable
      }
      AssertNotNullish(this.readable, 'TaskWriter', '写入任务资源失败，readable为空')
      AssertNotNullish(this.writable, 'TaskWriter', '写入任务资源失败，writable为空')
      const readable = this.readable
      const writable = this.writable
      this.errorOccurred = false
      if (!readable.listeners('error').includes(this.readableErrorHandler)) {
        readable.once('error', this.readableErrorHandler)
      }
      writable.once('error', (err) => {
        this.errorOccurred = true
        LogUtil.error('TaskWriter', `writable出错，${err}`)
        reject(err)
      })
      if (!readable.listeners('end').includes(this.readableEndHandler)) {
        readable.once('end', this.readableEndHandler)
      }
      writable.once('finish', () => {
        if (!this.errorOccurred) {
          if (this.paused) {
            resolve(FileSaveResult.PAUSE)
          } else {
            resolve(FileSaveResult.FINISH)
            writable.destroy()
          }
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
  public pause(): boolean {
    if (!this.readableFinished) {
      this.paused = true
      if (NotNullish(this.readable)) {
        this.readable.unpipe(this.writable)
      }
      if (NotNullish(this.writable)) {
        this.writable.end()
        this.bytesWritten = IsNullish(this.writable) ? 0 : this.writable.bytesWritten
      }
      return true
    } else {
      return false
    }
  }
}
