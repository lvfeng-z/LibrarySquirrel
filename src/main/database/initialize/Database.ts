import { db } from '../util/DatabaseUtil'
import * as fs from 'fs'

/**
 * @Description: 创建数据库,如果用户本地没有数据库的话就创建否则跳过
 * @CreationDate 2023-05-10 13:44:48
 */
export async function createDataTable() {
  /**
   * @Description: 创建用户表
   * @CreationDate 2023-06-01 22:53:23
   */
  const createTableStr = await fs.promises.readFile('./createTable.sql', 'utf-8');

  db.serialize(function () {
    db.run(createTableStr)
  })
  db.close
}
