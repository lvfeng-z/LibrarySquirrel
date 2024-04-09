import DB from '../../util/DatabaseUtil'
import * as fs from 'fs'
import yaml from 'js-yaml'
import FileSysUtil from '../../util/FileSysUtil'
import Database from 'better-sqlite3'
import DataBaseConstant from '../../constant/DataBaseConstant'
import logUtil from '../../util/LogUtil'
import createDataTables from './createDataTables.yml?asset'

/**
 * @Description: 初始化数据表
 * @CreationDate 2023-05-10 13:44:48
 */
async function InitializeDB() {
  const dbPath = DB.getDataBasePath()
  // 确认数据库文件路径是否存在
  await FileSysUtil.createDirIfNotExists(dbPath)

  // 创建数据库
  const options = {}
  const tempDB = new Database(dbPath + DataBaseConstant.DB_FILE_NAME, options)
  tempDB.close()
  logUtil.info('InitializeDataBase', '已创建数据库文件')

  // 创建数据表
  // 读取当前数据库的数据表
  DB.listAllDataTables().then((currentTables) => {
    let tableNameSqls: { tables: { name: string; sql: string }[] }
    // 读取初始化yml
    try {
      const yamlContent = fs.readFileSync(createDataTables, 'utf-8')
      tableNameSqls = yaml.load(yamlContent)
    } catch (e) {
      logUtil.error('InitializeDataBase', String(e))
      throw e
    }

    // 对于当前数据库中不存在的数据表，进行创建
    tableNameSqls.tables.forEach((tableNameSql) => {
      if (!currentTables.includes(tableNameSql.name)) {
        try {
          DB.connectDatabase().exec(tableNameSql.sql)
          logUtil.info('InitializeDataBase', '已创建数据表' + tableNameSql.name)
        } catch (e) {
          logUtil.error('InitializeDataBase', String(e))
          throw e
        }
      }
    })
  })
}

export default {
  InitializeDB
}
