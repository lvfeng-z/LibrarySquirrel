import { Readable, Writable } from 'node:stream'
import { FileSaveResult } from '../constant/FileSaveResult.js'
import LogUtil from './LogUtil.js'
import { assertNotNullish } from './AssertUtil.js'
import { notNullish } from './CommonUtil.js'

export default class FileWriter {
  public readable: Readable | undefined
  public writable: Writable | undefined
  private paused: boolean

  constructor(readable?: Readable, writeable?: Writable) {
    this.readable = readable
    this.writable = writeable
    this.paused = false
  }

  /**
   * 写入文件
   */
  public doWrite(newWritable?: Writable): Promise<FileSaveResult> {
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
        this.paused = true
        readable.removeListener('error', readableErrorHandler)
        readable.removeListener('end', readableEndHandler)
      })
      readable.once('resume', () => {
        this.paused = false
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
    this.paused = true
    this.writable = undefined
  }
}
