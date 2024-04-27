import DataBaseConstant from '../constant/DataBaseConstant'
import path from 'path'
import { app } from 'electron'
import { DB } from '../database/DB'

/**
 * 查询数据库所有数据表的名称
 */
async function listAllDataTables(): Promise<string[]> {
  const db = new DB('DatabaseUtil')
  try {
    const statement = await db.prepare(
      "select name from sqlite_master where name != 'sqlite_sequence'"
    )
    const rows = statement.all() as { name: string }[]
    return rows.map((row) => row.name)
  } finally {
    db.release()
  }
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
  listAllDataTables,
  getDataBasePath
}
