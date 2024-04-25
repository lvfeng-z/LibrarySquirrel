import Connection from 'better-sqlite3'

type PrimaryKey<T> = keyof T & (string | number)

// 基础数据操作接口
export interface BaseDao<T> {
  save(entity: T): Promise<void>
  updateById(id: PrimaryKey<T>, updateData: Partial<T>): Promise<void>
  deleteById(id: PrimaryKey<T>): Promise<void>
  selectPage(
    page: number,
    limit: number,
    query?: Partial<T>
  ): Promise<{ items: T[]; total: number }>
}

// 抽象基类，实现基本的CRUD方法
export abstract class AbstractBaseDao<T> implements BaseDao<T> {
  protected tableName: string

  protected constructor(tableName: string) {
    this.tableName = tableName
  }

  async save(entity: T): Promise<void> {
    const connection = await this.acquire()
    try {
      const keys = Object.keys(entity as Record<string, unknown>)
      const valueKeys = keys.map((item) => `@${item}`)

      const sql = `INSERT INTO "${this.tableName}" (${keys}) VALUES (${valueKeys})`
      await connection.prepare(sql).run(entity)
    } finally {
      await this.release(connection)
    }
  }

  async updateById(id: PrimaryKey<T>, updateData: Partial<T>): Promise<void> {
    const connection = await this.acquire()
    try {
      const setClauses = Object.entries(updateData)
        .map(([key, value]) => `"${key}" = '${String(value)}'`)
        .join(', ')

      const sql = `UPDATE "${this.tableName}" SET ${setClauses} WHERE "${this.getPrimaryKeyColumnName()}" = ${id}`
      await connection.run(sql)
    } finally {
      await this.release(connection)
    }
  }

  async deleteById(id: PrimaryKey<T>): Promise<void> {
    const connection = await this.acquire()
    try {
      const sql = `DELETE FROM "${this.tableName}" WHERE "${this.getPrimaryKeyColumnName()}" = ${id}`
      await connection.run(sql)
    } finally {
      await this.release(connection)
    }
  }

  async selectPage(
    page: number,
    limit: number,
    query?: Partial<T>
  ): Promise<{ items: T[]; total: number }> {
    const connection = await this.acquire()
    try {
      let whereClause = ''
      if (query) {
        const conditions = Object.entries(query)
          .map(([key, value]) => `"${key}" = '${String(value)}'`)
          .join(' AND ')

        whereClause = `WHERE ${conditions}`
      }

      const countSql = `SELECT COUNT(*) AS total FROM "${this.tableName}" ${whereClause}`
      const countResult = await connection.get(countSql)
      const total = countResult.total

      const offset = (page - 1) * limit
      const selectSql = `
        SELECT *
        FROM "${this.tableName}"
        ${whereClause}
        LIMIT ${limit} OFFSET ${offset}
      `
      const rows = await connection.all(selectSql)

      const items = rows.map((row) => this.rowToObject(row))
      return { items, total }
    } finally {
      await this.release(connection)
    }
  }

  protected abstract getPrimaryKeyColumnName(): string

  protected rowToObject(row: Record<string, unknown>): T {
    // 这里假设 T 是一个简单的对象类型，可以直接将 row 转换为 T 类型
    // 如果 T 类型更复杂（如包含嵌套对象、自定义类型等），可能需要更复杂的转换逻辑
    return row as T
  }

  private async acquire() {
    return await global.connectionPool.acquire()
  }

  private async release(connection: Connection) {
    global.connectionPool.release(connection)
  }
}
