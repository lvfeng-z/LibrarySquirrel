import { db, listAllDataTables } from '../util/DatabaseUtil'
import * as fs from 'fs'
import yaml from 'js-yaml'

/**
 * @Description: 初始化数据表
 * @CreationDate 2023-05-10 13:44:48
 */
export async function createDataTable() {
  // 读取当前数据库的数据表
  let currentTables: string[]
  listAllDataTables().then(async (tableNames) => {
    currentTables = tableNames

    // 读取初始化yml
    const yamlContent = await fs.promises.readFile(
      './src/main/database/initialize/createDataTables.yml',
      'utf-8'
    )
    const tableNameSqls: { tables: { name: string; sql: string }[] } = yaml.load(yamlContent)

    // 对于当前数据库中不存在的数据表，进行创建
    tableNameSqls.tables.forEach((tableNameSql) => {
      if (!currentTables.includes(tableNameSql.name)) {
        try {
          db.exec(tableNameSql.sql)
        } catch (e) {
          console.error(e)
        }
      }
    })
  })
}
