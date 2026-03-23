import { isNullish } from '@shared/util/CommonUtil.ts'
import DatabaseWorker from '../worker/DatabaseWorker.ts?modulePath'
import { DataBasePath } from '../util/DatabaseUtil.ts'
import { CreateDirIfNotExists } from '../util/FileSysUtil.ts'
import log from '../util/LogUtil.ts'
import DataBaseConstant from '../constant/DataBaseConstant.ts'
import { Worker } from 'node:worker_threads'

let dbWorker: Worker | undefined = undefined

export async function createDbWorker(): Promise<void> {
  if (isNullish(dbWorker)) {
    // 创建数据库目录
    const dbPath = DataBasePath()
    await CreateDirIfNotExists(dbPath)
    log.info('InitializeDataBase', '数据库目录已创建')
    dbWorker = new Worker(DatabaseWorker, {
      workerData: {
        dbPath: dbPath + DataBaseConstant.DB_FILE_NAME
      }
    })
    return new Promise<void>((resolve, reject) => {
      if (isNullish(dbWorker)) {
        reject()
        return
      }
      dbWorker.once('message', (msg: { type: string }) => {
        if (msg.type === 'ready') {
          resolve()
        }
      })
      setTimeout(() => reject(), 60000)
    })
  }
}

export function getDbWorker(): Worker {
  if (isNullish(dbWorker)) {
    throw new Error('db工作线程未初始化！')
  }
  return dbWorker
}
