import { db } from '../util/DatabaseUtil'

/**
 * @Description: 创建数据库,如果用户本地没有数据库的话就创建否则跳过
 * @CreationDate 2023-05-10 13:44:48
 */
export function createDataTable() {
  /**
   * @Description: 创建用户表
   * @CreationDate 2023-06-01 22:53:23
   */

  db.serialize(function () {
    db.run(
      'create table if not exists tag (id INTEGER PRIMARY KEY AUTOINCREMENT, tag_source text, name text, base_tag text);'
    )
  })
  db.close
}
