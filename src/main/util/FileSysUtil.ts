import Electron, { dialog } from 'electron'
import fs from 'fs/promises'
import LogUtil from '../util/LogUtil.ts'
import path from 'path'
import sharp from 'sharp'
import { IsNullish, NotNullish } from './CommonUtil.js'
import { Readable, Writable } from 'node:stream'
import { FileSaveResult } from '../constant/FileSaveResult.js'
import { GlobalVar, GlobalVars } from '../base/GlobalVar.js'

/**
 * 检查目录是否存在，如果不存在则创建此目录
 * @param dirPath
 */
export async function CreateDirIfNotExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath, fs.constants.F_OK | fs.constants.W_OK)
  } catch (error) {
    // 如果访问目录时出现错误（如目录不存在），则创建目录
    if ((error as { code: string }).code === 'ENOENT') {
      await fs.mkdir(dirPath, { recursive: true })
      LogUtil.info('FileSysUtil', '已创建目录：' + dirPath)
    } else {
      LogUtil.error('FileSysUtil', error)
      throw error // 其他错误类型，直接抛出
    }
  }
}

/**
 * 将类似 Unix 风格但以盘符开头的路径转换为标准的 Windows 路径格式
 * @param originalPath
 */
export function ConvertPath(originalPath: string): string {
  const match = originalPath.match(/^\/([a-zA-Z])\/(.*)$/)
  if (match) {
    // 为 Windows 系统转换路径格式
    return `${match[1]}:/${match[2]}`
  } else {
    return originalPath // 其他系统直接使用原始路径
  }
}

/**
 * 获得应用当前的根目录
 */
export function RootDir(): string {
  let root: string
  const NODE_ENV = process.env.NODE_ENV
  if (NODE_ENV == 'development') {
    root = path.join(Electron.app.getAppPath())
  } else {
    root = path.join(path.dirname(Electron.app.getPath('exe')))
  }
  return root
}

/**
 * 打开一个文件/路径选择弹窗
 */
export async function DirSelect(openFile: boolean): Promise<Electron.OpenDialogReturnValue> {
  const defaultPath = GlobalVar.get(GlobalVars.SETTINGS).store.workdir
  const properties: Array<'openFile' | 'openDirectory' | 'multiSelections'> = ['multiSelections']
  if (openFile) {
    properties.push('openFile')
  } else {
    properties.push('openDirectory')
  }
  return dialog.showOpenDialog({
    defaultPath: defaultPath,
    properties: properties
  })
}

/**
 * 读取作品资源
 * @param fullPath 作品路径
 * @param height 返回图片的高度
 * @param width 返回图片的宽度
 * @param visualHeight 可视区域高度
 * @param visualWidth 可视区域宽度
 */
export async function GetWorksResource(
  fullPath: string,
  height?: number,
  width?: number,
  visualHeight?: number,
  visualWidth?: number
): Promise<Buffer> {
  const resource = sharp(fullPath)
  if (IsNullish(height) && NotNullish(width)) {
    return resource.resize({ width: width, fit: 'contain' }).toBuffer()
  } else if (NotNullish(height) && IsNullish(width)) {
    return resource.resize({ height: height, fit: 'contain' }).toBuffer()
  } else if (NotNullish(height) && NotNullish(width)) {
    return resource.resize({ height: height, width: width, fit: 'contain' }).toBuffer()
  } else if (NotNullish(visualHeight) && NotNullish(visualWidth)) {
    const metadata = await resource.metadata()
    const imageHeight = metadata.height
    const imageWidth = metadata.width
    if (NotNullish(imageHeight) && NotNullish(imageWidth)) {
      if (imageHeight <= visualHeight && imageWidth <= visualWidth) {
        return resource.toBuffer()
      } else if (imageHeight > visualHeight && imageWidth <= visualWidth) {
        return resource.resize({ height: visualHeight, fit: 'contain' }).toBuffer()
      } else if (imageHeight <= visualHeight && imageWidth > visualWidth) {
        return resource.resize({ width: visualWidth, fit: 'contain' }).toBuffer()
      } else if (imageHeight > visualHeight && imageWidth > visualWidth) {
        if (imageHeight - visualHeight >= imageWidth - visualWidth) {
          return resource.resize({ height: visualHeight, fit: 'contain' }).toBuffer()
        } else {
          return resource.resize({ width: visualWidth, fit: 'contain' }).toBuffer()
        }
      } else {
        return resource.toBuffer()
      }
    } else {
      const msg = `无法获取图片的高度或宽度！path: ${fullPath}`
      LogUtil.error(msg)
      throw new Error(msg)
    }
  } else {
    return resource.toBuffer()
  }
}

export function PipelineReadWrite(readable: Readable, writable: Writable): Promise<FileSaveResult> {
  return new Promise((resolve, reject) => {
    let errorOccurred = false
    let paused = false
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
      paused = true
      readable.removeListener('error', readableErrorHandler)
      readable.removeListener('end', readableEndHandler)
    })
    readable.once('resume', () => {
      paused = false
    })
    writable.once('finish', () => {
      if (!errorOccurred) {
        return paused ? resolve(FileSaveResult.PAUSE) : resolve(FileSaveResult.FINISH)
      } else {
        reject()
      }
    })
    readable.pipe(writable)
  })
}

export function SanitizeFileName(fileName: string): string {
  // 定义非法字符及其对应的全角字符
  const illegalReplacements = {
    '\\': '＼', // 全角反斜杠
    '/': '／', // 全角正斜杠
    ':': '：', // 全角冒号
    '*': '＊', // 全角星号
    '?': '？', // 全角问号
    '"': '＂', // 全角双引号
    '<': '＜', // 全角小于号
    '>': '＞', // 全角大于号
    '|': '｜' // 全角竖线
  }

  let sanitized = fileName

  // 遍历每个非法字符，并进行替换
  for (const [illegalChar, replacement] of Object.entries(illegalReplacements)) {
    sanitized = sanitized.split(illegalChar).join(replacement)
  }

  return sanitized
}
