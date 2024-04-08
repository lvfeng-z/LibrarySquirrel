import path from 'path'
import { app } from 'electron'
import Database from 'better-sqlite3'

let DB_PATH = path.join(app.getAppPath(), '/database/CollectionsManager.db')
const NODE_ENV = process.env.NODE_ENV
if (NODE_ENV !== 'development') {
  DB_PATH = path.join(path.dirname(app.getPath('exe')), '/database/CollectionsManager.db')
}

/**
 * @Description: 连接数据库
 * @CreationDate 2023-05-10 13:48:41
 */
function connectDatabase() {
  const options = {}
  return new Database(DB_PATH, options)
}

export const db = connectDatabase()

/**
 * 查询数据库所有数据表的名称
 */
export function listAllDataTables(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    try {
      const statement = db.prepare("select name from sqlite_master where name != 'sqlite_sequence'")
      const rows = statement.all()
      resolve(rows.map((row) => row.name))
    } catch (e) {
      reject(e)
    }
  })
}
