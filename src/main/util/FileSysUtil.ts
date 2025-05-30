import Electron, { dialog } from 'electron'
import fs from 'fs'
import fsPromise from 'fs/promises'
import LogUtil from '../util/LogUtil.ts'
import path from 'path'
import sharp from 'sharp'
import { IsNullish, NotNullish } from './CommonUtil.js'
import { GlobalVar, GlobalVars } from '../base/GlobalVar.js'

/**
 * 检查目录是否存在，如果不存在则创建此目录
 * @param dirPath
 */
export async function CreateDirIfNotExists(dirPath: string): Promise<void> {
  try {
    await fsPromise.access(dirPath, fsPromise.constants.F_OK | fsPromise.constants.W_OK)
  } catch (error) {
    // 如果访问目录时出现错误（如目录不存在），则创建目录
    if ((error as { code: string }).code === 'ENOENT') {
      await fsPromise.mkdir(dirPath, { recursive: true })
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
export async function DirSelect(openFile: boolean, isModal?: boolean): Promise<Electron.OpenDialogReturnValue> {
  const defaultPath = GlobalVar.get(GlobalVars.SETTINGS).store.workdir
  const properties: Array<'openFile' | 'openDirectory' | 'multiSelections'> = ['multiSelections']
  if (openFile) {
    properties.push('openFile')
  } else {
    properties.push('openDirectory')
  }
  if (isModal) {
    return dialog.showOpenDialog(GlobalVar.get(GlobalVars.MAIN_WINDOW), {
      defaultPath: defaultPath,
      properties: properties
    })
  } else {
    return dialog.showOpenDialog({
      defaultPath: defaultPath,
      properties: properties
    })
  }
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
  return new Promise<NonSharedBuffer>((resolve, reject) =>
    fs.readFile(fullPath, async (err, data) => {
      if (err) reject(err)
      resolve(data)
    })
  ).then(async (data) => {
    const resource = sharp(data)
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
        throw Error(msg)
      }
    } else {
      return resource.toBuffer()
    }
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

/**
 * 给文件名添加后缀
 * @param filename
 * @param suffix
 * @constructor
 */
export function AddSuffix(filename: string, suffix: string) {
  const parsed = path.parse(filename)
  // 在文件名后添加后缀，保留扩展名
  return path.format({
    ...parsed,
    name: parsed.name + suffix,
    base: undefined // 确保使用 name + ext 而不是 base
  })
}
