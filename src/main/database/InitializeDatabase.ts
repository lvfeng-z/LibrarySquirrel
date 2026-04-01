import { createConnectionPool } from '../core/connectionPool.ts'

/**
 * @Description: 初始化数据库，同时创建一个全局连接池实例
 * @CreationDate 2023-05-10 13:44:48
 */
export async function InitializeDB() {
  // const dbPath = DataBasePath()
  // // 确认数据库文件路径是否存在
  // await CreateDirIfNotExists(dbPath)
  //
  // // 创建数据库
  // const tempDB = new BetterSqlite3(dbPath + DataBaseConstant.DB_FILE_NAME, {})
  // tempDB.close()
  // log.info('InitializeDataBase', '已创建数据库文件')

  // 创建全局连接池实例
  await createConnectionPool()

  // // 创建数据表
  // // 读取当前数据库的数据表
  // const currentTables = await ListAllDataTables()
  //
  // let tableNameSqlStatements: { tables: { name: string; sql: string }[] }
  // // 读取初始化yml
  // try {
  //   const yamlContent = fs.readFileSync(tableYml, 'utf-8')
  //   tableNameSqlStatements = yaml.load(yamlContent) as { tables: { name: string; sql: string }[] }
  // } catch (e) {
  //   log.error('InitializeDataBase', String(e))
  //   throw e
  // }
  //
  // // 对于当前数据库中不存在的数据表，进行创建
  // if (tableNameSqlStatements.tables.length > 0) {
  //   const notExistsTableNames: string[] = []
  //   const notExistsTableSql: string[] = []
  //   for (const tableNameSql of tableNameSqlStatements.tables) {
  //     if (!currentTables.includes(tableNameSql.name)) {
  //       notExistsTableNames.push(tableNameSql.name)
  //       notExistsTableSql.push(tableNameSql.sql)
  //     }
  //   }
  //   await Database.exec(notExistsTableSql.join(';'))
  //   log.info('InitializeDataBase', '已创建数据表' + notExistsTableNames.join())
  // }
}
