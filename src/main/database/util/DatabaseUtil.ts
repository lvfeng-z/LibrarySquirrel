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
function connectDatabase() {
  return new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('--------------------connectDatabaseErr: ' + err.message)
    }
    console.log('--------------------sqlite3 connected')
  })
}

export const db = connectDatabase()
