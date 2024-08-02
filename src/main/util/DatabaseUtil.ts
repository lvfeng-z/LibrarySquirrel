import DataBaseConstant from '../constant/DataBaseConstant.ts'
import path from 'path'
import DB from '../database/DB.ts'
import FileSysUtil from './FileSysUtil.ts'

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
  return path.join(FileSysUtil.getRootDir(), DataBaseConstant.DB_PATH)
}

/**
 * 基于对象生成一个sqlite3接受的纯对象
 */
function toObjAcceptedBySqlite3(obj: object | undefined): Record<string, unknown> {
  if (obj === undefined) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, value]) => value !== undefined || typeof value !== 'function')
      .map(([key, value]) => {
        if (typeof value === 'boolean') {
          return [key, value ? 1 : 0]
        }
        if (value !== null && typeof value === 'object') {
          return [key, JSON.stringify(value)]
        }
        return [key, value]
      })
  )
}

export default {
  listAllDataTables,
  getDataBasePath,
  toObjAcceptedBySqlite3
}
