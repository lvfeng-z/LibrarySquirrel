import Electron, { dialog } from 'electron'
import fs from 'fs/promises'
import logUtil from '../util/LogUtil.ts'
import path from 'path'
import SettingsService from '../service/SettingsService.ts'
import sharp from 'sharp'
import { isNullish } from './CommonUtil.js'

/**
 * 检查目录是否存在，如果不存在则创建此目录
 * @param dirPath
 */
export async function createDirIfNotExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath, fs.constants.F_OK | fs.constants.W_OK)
  } catch (error) {
    // 如果访问目录时出现错误（如目录不存在），则创建目录
    if ((error as { code: string }).code === 'ENOENT') {
      await fs.mkdir(dirPath, { recursive: true })
      logUtil.info('FileSysUtil', '已创建目录：' + dirPath)
    } else {
      logUtil.error('FileSysUtil', error)
      throw error // 其他错误类型，直接抛出
    }
  }
}

/**
 * 将类似 Unix 风格但以盘符开头的路径转换为标准的 Windows 路径格式
 * @param originalPath
 */
export function convertPath(originalPath) {
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
export function getRootDir(): string {
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
 * 打开一个
 */
export async function dirSelect(openFile: boolean): Promise<Electron.OpenDialogReturnValue> {
  const defaultPath = SettingsService.getSettings()['workdir']
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

export async function getResource(
  fullPath: string,
  height?: number,
  width?: number
): Promise<Buffer> {
  const resource = await fs.readFile(fullPath)
  if (isNullish(height) || isNullish(width)) {
    return resource
  } else {
    return sharp(resource).resize({ height: height, width: width, fit: 'contain' }).toBuffer()
  }
}
