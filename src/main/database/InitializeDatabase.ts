import DataBaseUtil from '../util/DatabaseUtil.ts'
import * as fs from 'fs'
import yaml from 'js-yaml'
import FileSysUtil from '../util/FileSysUtil.ts'
import Database from 'better-sqlite3'
import DataBaseConstant from '../constant/DataBaseConstant.ts'
import logUtil from '../util/LogUtil.ts'
import createDataTables from '../resources/database/createDataTables.yml?asset'
import ConnectionPool from './ConnectionPool.ts'
import DB from './DB.ts'

/**
 * @Description: 初始化数据库，同时创建一个全局连接池实例
 * @CreationDate 2023-05-10 13:44:48
 */
async function InitializeDB() {
  const dbPath = DataBaseUtil.getDataBasePath()
  // 确认数据库文件路径是否存在
  await FileSysUtil.createDirIfNotExists(dbPath)

  // 创建数据库
  const options = {}
  const tempDB = new Database(dbPath + DataBaseConstant.DB_FILE_NAME, options)
  tempDB.close()
  logUtil.info('InitializeDataBase', '已创建数据库文件')

  // 创建全局连接池实例
  global.readingConnectionPool = new ConnectionPool.ConnectionPool(true, ConnectionPool.POOL_CONFIG)
  logUtil.info('InitializeDataBase', '已创建读取连接池')
  global.writingConnectionPool = new ConnectionPool.ConnectionPool(
    false,
    ConnectionPool.POOL_CONFIG
  )
  logUtil.info('InitializeDataBase', '已创建写入连接池')

  // 创建数据表
  // 读取当前数据库的数据表
  DataBaseUtil.listAllDataTables().then(async (currentTables) => {
    let tableNameSqlStatements: { tables: { name: string; sql: string }[] }
    // 读取初始化yml
    try {
      const yamlContent = fs.readFileSync(createDataTables, 'utf-8')
      tableNameSqlStatements = yaml.load(yamlContent)
    } catch (e) {
      logUtil.error('InitializeDataBase', String(e))
      throw e
    }

    // 对于当前数据库中不存在的数据表，进行创建
    if (tableNameSqlStatements.tables.length > 0) {
      const db = new DB('InitializeDatabase')
      try {
        for (const tableNameSql of tableNameSqlStatements.tables) {
          if (!currentTables.includes(tableNameSql.name)) {
            await db.exec(tableNameSql.sql)
            logUtil.info('InitializeDataBase', '已创建数据表' + tableNameSql.name)
          }
        }
      } catch (e) {
        logUtil.error('InitializeDataBase', String(e))
      } finally {
        db.release()
      }
    }
  })
}

export default {
  InitializeDB
}
