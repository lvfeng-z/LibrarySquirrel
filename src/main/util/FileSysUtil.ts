import fs from 'fs/promises'
import logUtil from '../util/LogUtil'

async function createDirIfNotExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath, fs.constants.F_OK | fs.constants.W_OK)
  } catch (error: any) {
    // 如果访问目录时出现错误（如目录不存在），则创建目录
    if (error.code === 'ENOENT') {
      await fs.mkdir(dirPath, { recursive: true })
      logUtil.info('FileSysUtil', '已创建目录：' + dirPath)
    } else {
      logUtil.error('FileSysUtil', error)
      throw error // 其他错误类型，直接抛出
    }
  }
}

export default {
  createDirIfNotExists
}
