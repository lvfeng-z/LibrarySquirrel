import DataBaseConstant from '../constant/DataBaseConstant.ts'
import path from 'path'
import DB from '../database/DB.ts'
import { RootDir } from './FileSysUtil.ts'

/**
 * 查询数据库所有数据表的名称
 */
export async function ListAllDataTables(): Promise<string[]> {
  const db = new DB('DatabaseUtil')
  try {
    const statement = "SELECT name FROM sqlite_master WHERE name != 'sqlite_sequence'"

    const rows = (await db.all(statement)) as { name: string }[]
    return rows.map((row) => row.name)
  } finally {
    db.release()
  }
}

/**
 * 获取数据库文件路径
 */
export function DataBasePath() {
  return path.join(RootDir(), DataBaseConstant.DB_PATH)
}

/**
 * 基于对象生成一个sqlite3接受的纯对象
 */
export function ToObjAcceptedBySqlite3(obj: object | undefined, ignore?: string[]): Record<string, unknown> {
  if (obj === undefined) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([key, value]) => value !== undefined && typeof value !== 'function' && !ignore?.includes(key))
      .map(([key, value]) => {
        if (typeof value === 'boolean') {
          return [key, value ? 1 : 0]
        }
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          return [key, JSON.stringify(value)]
        }
        return [key, value]
      })
  )
}
