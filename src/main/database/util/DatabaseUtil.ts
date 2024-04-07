import sqlite3 from 'sqlite3'
import path from 'path'
import { app } from 'electron'

let DB_PATH = path.join(app.getAppPath(), '/database/pre-work.db')
const NODE_ENV = process.env.NODE_ENV
if (NODE_ENV !== 'development') {
  DB_PATH = path.join(path.dirname(app.getPath('exe')), '/database/pre-work.db')
}

/**
 * @Description: 连接数据库
 * @CreationDate 2023-05-10 13:48:41
 */
function connectDatabase(): sqlite3.Database {
  return new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('connectDatabaseErr: ' + err.message)
    }
    console.log('sqlite3 connected')
  })
}

export const db = connectDatabase()

/**
 * 查询数据库所有数据表的名称
 */
export function listAllDataTables(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.all<{ name: string }>(
        "select name from sqlite_master where name != 'sqlite_sequence'",
        (err, rows) => {
          if (err) {
            reject(err)
          } else {
            resolve(rows.map((row) => row.name))
          }
        }
      )
    })
  })
}
