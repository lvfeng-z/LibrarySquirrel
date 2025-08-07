import { DataBasePath, ListAllDataTables } from '../util/DatabaseUtil.ts'
import * as fs from 'fs'
import yaml from 'js-yaml'
import { CreateDirIfNotExists } from '../util/FileSysUtil.ts'
import Database from 'better-sqlite3'
import DataBaseConstant from '../constant/DataBaseConstant.ts'
import LogUtil from '../util/LogUtil.ts'
import DB from './DB.ts'
import { GlobalVar, GlobalVars } from '../base/GlobalVar.ts'
import tableYml from '../resources/database/createDataTables.yml?asset'

/**
 * @Description: 初始化数据库，同时创建一个全局连接池实例
 * @CreationDate 2023-05-10 13:44:48
 */
export async function InitializeDB() {
  const dbPath = DataBasePath()
  // 确认数据库文件路径是否存在
  await CreateDirIfNotExists(dbPath)

  // 创建数据库
  const options = {}
  const tempDB = new Database(dbPath + DataBaseConstant.DB_FILE_NAME, options)
  tempDB.close()
  LogUtil.info('InitializeDataBase', '已创建数据库文件')

  // 创建全局连接池实例
  GlobalVar.create(GlobalVars.CONNECTION_POOL)

  // 创建数据表
  // 读取当前数据库的数据表
  return ListAllDataTables().then((currentTables) => {
    let tableNameSqlStatements: { tables: { name: string; sql: string }[] }
    // 读取初始化yml
    try {
      const yamlContent = fs.readFileSync(tableYml, 'utf-8')
      tableNameSqlStatements = yaml.load(yamlContent) as { tables: { name: string; sql: string }[] }
    } catch (e) {
      LogUtil.error('InitializeDataBase', String(e))
      throw e
    }

    // 对于当前数据库中不存在的数据表，进行创建
    const processList: Promise<unknown>[] = []
    if (tableNameSqlStatements.tables.length > 0) {
      const db = new DB('InitializeDatabase')
      try {
        for (const tableNameSql of tableNameSqlStatements.tables) {
          if (!currentTables.includes(tableNameSql.name)) {
            const process = db.exec(tableNameSql.sql)
            processList.push(process)
            LogUtil.info('InitializeDataBase', '已创建数据表' + tableNameSql.name)
          }
        }
      } catch (e) {
        LogUtil.error('InitializeDataBase', String(e))
      } finally {
        db.release()
      }
    }
    return Promise.allSettled(processList)
  })
}
