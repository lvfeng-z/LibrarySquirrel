import PageModel from '../model/utilModels/PageModel.ts'
import StringUtil from '../util/StringUtil.ts'
import DB from '../database/DB.ts'
import BaseModel from '../model/BaseModel.ts'
import BaseQueryDTO from '../model/queryDTO/BaseQueryDTO.ts'
import ObjectUtil from '../util/ObjectUtil.ts'
import LogUtil from '../util/LogUtil.ts'

type PrimaryKey = string | number

/**
 * 抽象Dao基类，实现基本的CRUD方法
 */
export default abstract class BaseDao<Query extends BaseQueryDTO, Model extends BaseModel> {
  /**
   * 数据表名
   * @protected
   */
  protected tableName: string
  /**
   * 继承者类名
   * @private
   */
  private readonly childClassName: string
  /**
   * 封装数据库链接实例
   * @private
   */
  private db: DB | undefined

  protected constructor(tableName: string, childClassName: string) {
    this.tableName = tableName
    this.childClassName = childClassName
    this.db = undefined
  }

  /**
   * 保存
   * @param entity
   */
  public async save(entity: Model): Promise<number | string> {
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

  /**
   * 删除
   * @param id
   */
  public async deleteById(id: PrimaryKey): Promise<number> {
    const db = this.acquire()
    try {
      const sql = `DELETE FROM "${this.tableName}" WHERE "${this.getPrimaryKeyColumnName()}" = ${id}`
      return (await db.prepare(sql)).run().changes
    } finally {
      db.release()
    }
  }

  /**
   * 更新
   * @param id
   * @param updateData
   */
  public async updateById(id: PrimaryKey, updateData: Model): Promise<number> {
    if (id === undefined) {
      const msg = '更新时主键不能为空'
      LogUtil.error('BaseDao', msg)
      throw new Error(msg)
    }
    const db = this.acquire()
    try {
      // 设置createTime和updateTime
      updateData.updateTime = Date.now()

      // 生成一个不包含值为undefined的属性的对象
      const existingValue = ObjectUtil.nonUndefinedValue(updateData)
      const keys = Object.keys(existingValue)
      const setClauses = keys.map((item) => `${StringUtil.camelToSnakeCase(item)} = @${item}`)
      const sql = `UPDATE "${this.tableName}" SET ${setClauses} WHERE "${this.getPrimaryKeyColumnName()}" = ${id}`
      return (await db.prepare(sql)).run(existingValue).changes
    } finally {
      db.release()
    }
  }

  /**
   * 主键查询
   * @param id
   */
  public async getById(id: PrimaryKey): Promise<Model> {
    const db = this.acquire()
    try {
      const statement = `select * from ${this.tableName} where ${this.getPrimaryKeyColumnName()} = @${this.getPrimaryKeyColumnName()}`
      let result = (await db.prepare(statement)).get({ id: id }) as object
      if (result) {
        result = this.getResultTypeData(result as Record<string, unknown>)
      }
      return result as Model
    } finally {
      db.release()
    }
  }

  /**
   * 分页查询
   * @param page
   */
  public async selectPage(page: PageModel<Query, Model>): Promise<PageModel<Query, Model>> {
    const db = this.acquire()
    try {
      // 生成where字句
      let whereClause = ''
      if (page.query) {
        whereClause = this.getWhereClause(page.query)
      }

      // 拼接查询语句
      let statement = `SELECT * FROM "${this.tableName}" ${whereClause}`
      // 拼接排序和分页字句
      statement = await this.sorterAndPager(statement, whereClause, page)

      // 查询
      const rows = (await db.prepare(statement)).all(page.query) as object[]

      // 结果集中的元素的属性名从snakeCase转换为camelCase，并赋值给page.data
      page.data = this.getResultTypeDataList<Model>(rows)

      return page
    } finally {
      db.release()
    }
  }

  /**
   * 拼接where字句
   * @protected
   * @param whereClauses
   */
  protected splicingWhereClauses(whereClauses: string[]): string {
    if (whereClauses.length > 0) {
      return `where ${whereClauses.length > 1 ? whereClauses.join(' and ') : whereClauses[0]}`
    } else {
      return ''
    }
  }

  /**
   * 获取where字句
   * @protected
   * @param queryConditions
   * @param alias
   */
  protected getWhereClause(queryConditions: Query, alias?: string): string {
    const keyAndWhereClauses = this.getWhereClauses(queryConditions, alias)
    const whereClauses = Object.entries(keyAndWhereClauses).map((item) => item[1])
    return this.splicingWhereClauses(whereClauses)
  }

  /**
   * 获取where字句
   * @param queryConditions 查询条件
   * @param alias 所查询数据表的别名
   * @protected
   * @return 属性名为键，where字句为值的Record对象
   */
  protected getWhereClauses(queryConditions: Query, alias?: string): Record<string, string> {
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
   * 为查询语句附加分页字句（为第一个参数statement末端拼接分页字句并返回，最后一个参数page的dataCount和pageCount赋值，如果不传入fromClause，则使用this.tableName作为计数语句的from子句中的唯一数据表）
   * @param statement 需要分页的语句
   * @param whereClause 分页语句的where字句
   * @param page 分页配置
   * @param fromClause 分页语句的from子句
   * @protected
   */
  protected async pager(
    statement: string,
    whereClause: string,
    page: PageModel<Query, Model>,
    fromClause?: string
  ): Promise<string> {
    if (page.paging === undefined || page.paging) {
      statement += ' ' + (await this.getPagingClause(whereClause, page, fromClause))
    }
    return statement
  }

  /**
   * 获取分页字句，并给参数page的dataCount和pageCount赋值，如果不传入fromClause，则使用this.tableName作为计数语句的from子句中的唯一数据表
   * @param whereClause 需要分页的语句的where字句
   * @param page 分页配置
   * @param fromClause 分页语句的from子句
   * @protected
   */
  protected async getPagingClause(
    whereClause: string,
    page: PageModel<Query, Model>,
    fromClause?: string
  ): Promise<string> {
    const db = this.acquire()
    try {
      if (StringUtil.isBlank(fromClause)) {
        fromClause = this.tableName
      } else {
        fromClause = StringUtil.removePrefixIfPresent(fromClause as string, 'from ')
      }
      // 查询数据总量，计算页码数量
      const nonUndefinedValue = ObjectUtil.nonUndefinedValue(page.query)
      const countSql = `SELECT COUNT(*) AS total FROM ${fromClause} ${whereClause}`
      const countResult = (await db.prepare(countSql)).get(nonUndefinedValue) as { total: number }
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
   * 为查询语句附加排序字句（为第一个参数statement末端拼接排序字句并返回）
   * @param statement 需要分页的语句
   * @param page 排序配置
   * @protected
   */
  protected sorter(statement: string, page: PageModel<Query, Model>): string {
    if (page.paging === undefined || page.paging) {
      statement += ' ' + this.getSortClause(page)
    }
    return statement
  }

  /**
   * 获取排序字句
   * @param page
   * @protected
   */
  protected getSortClause(page: PageModel<Query, Model>): string {
    let sortClauses: string = ''
    if (page.sort !== undefined) {
      sortClauses = page.sort
        .filter((item) => item[1] === 'asc' || item[1] === 'desc')
        .map((item) => {
          item[0] = StringUtil.camelToSnakeCase(item[0])
          return item.join(' ')
        })
        .join(',')
    }
    if (sortClauses !== '') {
      sortClauses = 'ORDER BY ' + sortClauses
    }
    return sortClauses
  }

  /**
   * 为查询语句附加排序和分页字句（为第一个参数statement末端拼接排序和分页字句并返回，最后一个参数page的dataCount和pageCount赋值，如果不传入fromClause，则使用this.tableName作为计数语句的from子句中的唯一数据表）
   * @param statement 需要分页的语句
   * @param whereClause 分页语句的where字句
   * @param page 排序配置
   * @param fromClause 分页语句的from子句
   * @protected
   */
  protected async sorterAndPager(
    statement: string,
    whereClause: string,
    page: PageModel<Query, Model>,
    fromClause?: string
  ): Promise<string> {
    statement = this.sorter(statement, page)
    statement = await this.pager(statement, whereClause, page, fromClause)
    return statement
  }

  /**
   * 以元素的属性名为snakeCase格式的dataList为原型，返回一个Result类型的数组
   * @param dataList
   * @protected
   */
  protected getResultTypeDataList<Result>(dataList: object[]): Result[] {
    return dataList.map((row) => this.getResultTypeData(row as Record<string, unknown>))
  }

  /**
   * 以元素的属性名为snakeCase格式的data为原型，返回一个Result类型的对象
   * @protected
   * @param data
   */
  protected getResultTypeData<Result>(data: Record<string, unknown>): Result {
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [StringUtil.snakeToCamelCase(k), v])
    ) as Result
  }

  protected abstract getPrimaryKeyColumnName(): string

  protected acquire() {
    if (this.db === undefined) {
      this.db = new DB(this.childClassName)
    }
    return this.db
  }
}
