import { Readable } from 'node:stream'
import { FileSaveResult } from '../constant/FileSaveResult.js'
import log from './LogUtil.js'
import { assertNotNullish } from '@shared/util/AssertUtil.ts'
import { isNullish, notNullish } from '@shared/util/CommonUtil.ts'
import fs from 'fs'
import Resource from '@shared/model/entity/Resource.js'

export default class ResourceWriter {
  /**
   * 资源实例
   */
  public resource: Resource | undefined
  /**
   * 读取流
   */
  public readable: Readable | undefined
  /**
   * 写入流
   */
  public writable: fs.WriteStream | undefined
  /**
   * 资源大小，单位：字节（Byte）
   */
  public resourceSize: number
  /**
   * 已写入的数据量（只在任务暂停时更新，用于解决恢复任务时首次查询到的进度为0的问题）
   */
  public bytesWritten: number
  /**
   * 进度回调函数（用于 Worker 线程中发送进度到主线程）
   */
  public onProgress: ((bytesWritten: number) => void) | undefined
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

  constructor(readable?: Readable, writeable?: fs.WriteStream) {
    this.readable = readable
    this.writable = writeable
    this.resourceSize = 0
    this.bytesWritten = 0
    this.paused = false
    this.readableFinished = false
    this.resource = undefined
    this.errorOccurred = false
    this.onProgress = undefined
  }

  /**
   * 写入文件
   */
  public doWrite(newWritable?: fs.WriteStream): Promise<FileSaveResult> {
    if (this.paused) {
      return Promise.resolve(FileSaveResult.PAUSE)
    }
    this.paused = false

    return new Promise((resolve, reject) => {
      // 可读流的error事件回调
      const readableErrorHandler = (err: Error) => {
        this.errorOccurred = true
        this.readable?.unpipe(this.writable)
        log.error(this.constructor.name, `readable出错${err}`)
        reject(err)
      }
      // 可读流的end事件回调
      const readableEndHandler = () => {
        this.readableFinished = true
        if (!this.errorOccurred) {
          this.writable?.end()
        } else {
          reject(new Error('可读流以错误状态结束'))
        }
      }
      // 进度追踪回调
      const progressHandler = (chunk: Buffer) => {
        this.bytesWritten += chunk.length
        if (this.onProgress) {
          this.onProgress(this.bytesWritten)
        }
      }

      if (notNullish(newWritable)) {
        this.writable = newWritable
      }
      assertNotNullish(this.readable, '写入任务资源失败，readable为空')
      assertNotNullish(this.writable, '写入任务资源失败，writable为空')
      const readable = this.readable
      const writable = this.writable
      this.errorOccurred = false
      this.bytesWritten = 0

      if (!readable.listeners('error').includes(readableErrorHandler)) {
        readable.once('error', readableErrorHandler)
      }
      writable.once('error', (err) => {
        this.errorOccurred = true
        log.error(this.constructor.name, `writable出错，${err}`)
        writable.destroy()
        reject(err)
      })
      if (!readable.listeners('end').includes(readableEndHandler)) {
        readable.once('end', readableEndHandler)
      }
      // 监听 data 事件进行进度追踪
      readable.on('data', progressHandler)
      writable.once('finish', () => {
        // 移除进度监听器
        readable.removeListener('data', progressHandler)
        if (!this.errorOccurred) {
          if (this.paused) {
            resolve(FileSaveResult.PAUSE)
          } else {
            resolve(FileSaveResult.FINISH)
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
   * @return 资源是否已经完成写入
   */
  public pause(): boolean {
    if (!this.readableFinished) {
      this.paused = true
      if (notNullish(this.readable)) {
        this.readable.unpipe(this.writable)
      }
      if (notNullish(this.writable)) {
        this.writable?.end()
        this.bytesWritten = isNullish(this.writable) ? 0 : this.writable.bytesWritten
      }
      return false
    } else {
      return true
    }
  }
}
