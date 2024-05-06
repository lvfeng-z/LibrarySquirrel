import { PageModel } from '../model/utilModels/PageModel'
import StringUtil from '../util/StringUtil'
import { DB } from '../database/DB'
import BaseModel from '../model/BaseModel'

type PrimaryKey = string | number

// 基础数据操作接口
export interface BaseDao<Query extends BaseModel, Result> {
  save(entity: Query): Promise<number | string>
  deleteById(id: PrimaryKey): Promise<number>
  updateById(id: PrimaryKey, updateData: Partial<Query>): Promise<number>
  getById(id: PrimaryKey): Promise<Query>
  selectPage(page: PageModel<Query, Result>): Promise<PageModel<Query, Result>>
}

// 抽象基类，实现基本的CRUD方法
export abstract class AbstractBaseDao<Query extends BaseModel, Result>
  implements BaseDao<Query, Result>
{
  protected tableName: string
  private readonly childClassName: string

  protected constructor(tableName: string, childClassName: string) {
    this.tableName = tableName
    this.childClassName = childClassName
  }

  async save(entity: Partial<Query>): Promise<number | string> {
    const db = this.acquire()
    try {
      // 设置createTime和updateTime
      entity.createTime = Date.now()
      entity.updateTime = Date.now()

      const keys = Object.keys(entity).map((key) => StringUtil.camelToSnakeCase(key))
      const valueKeys = Object.keys(entity).map((item) => `@${item}`)
      const sql = `INSERT INTO "${this.tableName}" (${keys}) VALUES (${valueKeys})`
      return (await db.prepare(sql)).run(entity).lastInsertRowid as number
    } finally {
      db.release()
    }
  }

  async deleteById(id: PrimaryKey): Promise<number> {
    const db = this.acquire()
    try {
      const sql = `DELETE FROM "${this.tableName}" WHERE "${this.getPrimaryKeyColumnName()}" = ${id}`
      return (await db.prepare(sql)).run().changes
    } finally {
      db.release()
    }
  }

  async updateById(id: PrimaryKey, updateData: Partial<Query>): Promise<number> {
    const db = this.acquire()
    try {
      // 设置createTime和updateTime
      updateData.updateTime = Date.now()

      const keys = Object.keys(updateData)
      const setClauses = keys.map((item) => `${StringUtil.camelToSnakeCase(item)} = @${item}`)
      const sql = `UPDATE "${this.tableName}" SET ${setClauses} WHERE "${this.getPrimaryKeyColumnName()}" = ${id}`
      return (await db.prepare(sql)).run(updateData).changes
    } finally {
      db.release()
    }
  }

  async getById(id: PrimaryKey): Promise<Query> {
    const db = this.acquire()
    try {
      const statement = `select * from ${this.tableName} where ${this.getPrimaryKeyColumnName()} = @${this.getPrimaryKeyColumnName()}`
      const originResult = (await db.prepare(statement)).get({ id: id }) as object
      const result = {}
      Object.entries(originResult).forEach(([key, value]) => {
        result[StringUtil.snakeToCamelCase(key)] = value
      })
      return result as Query
    } finally {
      db.release()
    }
  }

  async selectPage(page: PageModel<Query, Result>): Promise<PageModel<Query, Result>> {
    const db = this.acquire()
    try {
      // 生成where字句
      let whereClause = ''
      if (page.query) {
        const conditions = Object.keys(page.query).map(
          (key) => `"${StringUtil.camelToSnakeCase(key)}" = @${key}`
        )

        if (conditions) {
          if (conditions.length == 1) {
            whereClause = `WHERE ${conditions.toString()}`
          }
          if (conditions.length > 1) {
            whereClause = `WHERE ${conditions.join(' AND ')}`
          }
        }
      }

      // 拼接查询语句
      let selectSql = `SELECT * FROM "${this.tableName}" ${whereClause}`
      selectSql = await this.pager(selectSql, whereClause, page)

      const rows = (await db.prepare(selectSql)).all(page.query) as object[]

      // 结果集中的元素的属性名从snakeCase转换为camelCase，并赋值给page.data
      page.data = this.getResultTypeDataList(rows)

      return page
    } finally {
      db.release()
    }
  }

  /**
   * 获取where字句
   * @param queryConditions 查询条件
   * @param alias 所查询数据表的别名
   * @protected
   */
  protected getWhereClauses(
    queryConditions: Partial<Query>,
    alias?: string
  ): Record<string, string> {
    const whereClauses: Record<string, string> = {}
    if (queryConditions) {
      Object.entries(queryConditions).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          const snakeCaseKey = StringUtil.camelToSnakeCase(key)
          whereClauses[key] =
            alias == undefined
              ? `"${snakeCaseKey}" = @${key}`
              : `${alias}."${snakeCaseKey}" = @${key}`
        }
      })
    }

    return whereClauses
  }

  /**
   * 分页器（为第一个参数statement末端拼接分页字句并返回，最后一个参数page的dataCount和pageCount赋值）
   * @param statement 需要分页的语句
   * @param whereClause 分页语句的where字句
   * @param page 分页配置
   * @protected
   */
  protected async pager(
    statement: string,
    whereClause: string,
    page: PageModel<Query, Result>
  ): Promise<string> {
    statement += ' ' + (await this.getPagingClause(whereClause, page))
    return statement
  }

  /**
   * 获取分页字句，并给参数page的dataCount和pageCount赋值）
   * @param whereClause 需要分页的语句的where字句
   * @param page 分页配置
   * @protected
   */
  protected async getPagingClause(
    whereClause: string,
    page: PageModel<Query, Result>
  ): Promise<string> {
    const db = this.acquire()
    try {
      // 查询数据总量，计算页码数量
      const countSql = `SELECT COUNT(*) AS total FROM "${this.tableName}" ${whereClause}`
      const countResult = (await db.prepare(countSql)).get(page.query) as { total: number }
      page.dataCount = countResult.total
      page.pageCount = Math.ceil(countResult.total / page.pageSize)

      // 计算偏移量
      const offset = (page.pageNumber - 1) * page.pageSize

      return `LIMIT ${page.pageSize} OFFSET ${offset}`
    } finally {
      db.release()
    }
  }

  /**
   * 以元素的属性名为snakeCase格式的dataList为原型，返回一个Result类型的数组
   * @param dataList
   * @protected
   */
  protected getResultTypeDataList(dataList: object[]): Result[] {
    return dataList.map(
      (row) =>
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [StringUtil.snakeToCamelCase(k), v])
        ) as Result
    )
  }

  protected abstract getPrimaryKeyColumnName(): string

  protected acquire() {
    return new DB(this.childClassName)
  }
}
