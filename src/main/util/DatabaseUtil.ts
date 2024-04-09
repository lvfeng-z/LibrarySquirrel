import Database from 'better-sqlite3'
import DataBaseConstant from '../constant/DataBaseConstant'
import path from 'path'
import { app } from 'electron'

/**
 * @Description: 连接数据库
 * @CreationDate 2023-05-10 13:48:41
 */
function connectDatabase() {
  const dbPath = getDataBasePath() + DataBaseConstant.DB_FILE_NAME
  const options = {}
  return new Database(dbPath, options)
}

/**
 * 查询数据库所有数据表的名称
 */
function listAllDataTables(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    try {
      const db = connectDatabase()
      const statement = db.prepare("select name from sqlite_master where name != 'sqlite_sequence'")
      const rows = statement.all()
      resolve(rows.map((row) => row.name))
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * 获取数据库文件路径
 */
function getDataBasePath() {
  let dbPath: string
  const NODE_ENV = process.env.NODE_ENV
  if (NODE_ENV == 'development') {
    dbPath = path.join(app.getAppPath(), DataBaseConstant.DB_PATH)
  } else {
    dbPath = path.join(path.dirname(app.getPath('exe')), DataBaseConstant.DB_PATH)
  }
  return dbPath
}

export default {
  connectDatabase,
  listAllDataTables,
  getDataBasePath
}
