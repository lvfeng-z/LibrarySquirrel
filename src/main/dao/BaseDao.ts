import { PageModel } from '../model/utilModels/PageModel'
import StringUtil from '../util/StringUtil'
import { DB } from '../database/DB'
import BaseModel from '../model/BaseModel'

type PrimaryKey = string | number

// 基础数据操作接口
export interface BaseDao<T extends BaseModel> {
  save(entity: T): Promise<number | string>
  updateById(id: PrimaryKey, updateData: Partial<T>): Promise<number>
  deleteById(id: PrimaryKey): Promise<number>
  selectPage(page: PageModel<T>): Promise<PageModel<T>>
  getById(id: PrimaryKey): Promise<T>
}

// 抽象基类，实现基本的CRUD方法
export abstract class AbstractBaseDao<T extends BaseModel> implements BaseDao<T> {
  protected tableName: string
  private readonly childClassName: string

  protected constructor(tableName: string, childClassName: string) {
    this.tableName = tableName
    this.childClassName = childClassName
  }

  async save(entity: Partial<T>): Promise<number | string> {
    const db = this.acquire()
    try {
      // 设置createTime和updateTime
      entity.createTime = String(Date.now())
      entity.updateTime = String(Date.now())

      const keys = Object.keys(entity).map((key) => StringUtil.camelToSnakeCase(key))
      const valueKeys = Object.keys(entity).map((item) => `@${item}`)
      const sql = `INSERT INTO "${this.tableName}" (${keys}) VALUES (${valueKeys})`
      return (await db.prepare(sql)).run(entity).lastInsertRowid as number
    } finally {
      db.release()
    }
  }

  async updateById(id: PrimaryKey, updateData: Partial<T>): Promise<number> {
    const db = this.acquire()
    try {
      // 设置createTime和updateTime
      updateData.updateTime = String(Date.now())

      const keys = Object.keys(updateData).map((key) => StringUtil.camelToSnakeCase(key))
      const setClauses = keys.map((item) => `${StringUtil.camelToSnakeCase(item)} = @${item}`)
      const sql = `UPDATE "${this.tableName}" SET ${setClauses} WHERE "${this.getPrimaryKeyColumnName()}" = ${id}`
      return (await db.prepare(sql)).run(updateData).changes
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

  async selectPage(page: PageModel<T>): Promise<PageModel<T>> {
    const db = this.acquire()
    try {
      let whereClause = ''
      if (page.query) {
        const conditions = Object.entries(page.query)
          .map(([key, value]) => `"${key}" = '${String(value)}'`)
          .join(' AND ')

        whereClause = `WHERE ${conditions}`
      }

      const countSql = `SELECT COUNT(*) AS total FROM "${this.tableName}" ${whereClause}`
      const countResult = (await db.prepare(countSql)).get() as { total: number }
      page.pageNumber = countResult.total

      const offset = (page.pageNumber - 1) * page.pageSize
      const selectSql = `
        SELECT *
        FROM "${this.tableName}"
        ${whereClause}
        LIMIT ${page.pageSize} OFFSET ${offset}
      `
      const rows = (await db.prepare(selectSql)).all()

      page.data = rows.map((row) => this.rowToObject(row as Record<string, unknown>))
      return page
    } finally {
      db.release()
    }
  }

  async getById(id: PrimaryKey): Promise<T> {
    const db = this.acquire()
    try {
      const statement = `select * from ${this.tableName} where ${this.getPrimaryKeyColumnName()} = @${this.getPrimaryKeyColumnName()}`
      const originResult = (await db.prepare(statement)).get({ id: id }) as object
      const result = {}
      Object.entries(originResult).forEach(([key, value]) => {
        result[StringUtil.snakeToCamelCase(key)] = value
      })
      return result as T
    } finally {
      db.release()
    }
  }

  protected getWhereClauses(queryConditions: Partial<T>, alias?: string): Record<string, string> {
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

  protected abstract getPrimaryKeyColumnName(): string

  protected rowToObject(row: Record<string, unknown>): T {
    // 这里假设 T 是一个简单的对象类型，可以直接将 row 转换为 T 类型
    // 如果 T 类型更复杂（如包含嵌套对象、自定义类型等），可能需要更复杂的转换逻辑
    return row as T
  }

  protected acquire() {
    return new DB(this.childClassName)
  }
}
