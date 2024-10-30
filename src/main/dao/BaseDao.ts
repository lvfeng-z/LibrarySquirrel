import PageModel from '../model/utilModels/PageModel.ts'
import StringUtil from '../util/StringUtil.ts'
import DB from '../database/DB.ts'
import BaseModel from '../model/BaseModel.ts'
import BaseQueryDTO from '../model/queryDTO/BaseQueryDTO.ts'
import ObjectUtil from '../util/ObjectUtil.ts'
import LogUtil from '../util/LogUtil.ts'
import { toObjAcceptedBySqlite3 } from '../util/DatabaseUtil.ts'
import SelectItem from '../model/utilModels/SelectItem.ts'
import { COMPARATOR } from '../constant/CrudConstant.ts'
import QuerySortOption from '../constant/QuerySortOption.ts'
import lodash from 'lodash'
import { arrayNotEmpty, isNullish, notNullish } from '../util/CommonUtil.ts'
import { assertNotNullish } from '../util/AssertUtil.js'

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
  /**
   * 是否为注入的链接实例
   * @private
   */
  protected readonly injectedDB: boolean

  protected constructor(tableName: string, childClassName: string, db?: DB) {
    this.tableName = tableName
    this.childClassName = childClassName
    if (notNullish(db)) {
      this.db = db
      this.injectedDB = true
    } else {
      this.injectedDB = false
    }
  }

  /**
   * 保存
   * @param entity
   */
  public async save(entity: Model): Promise<number | string> {
    // 设置createTime和updateTime
    entity.createTime = Date.now()
    entity.updateTime = Date.now()

    // 转换为sqlite3接受的数据类型
    const plainObject = toObjAcceptedBySqlite3(entity)

    const keys = Object.keys(plainObject).map((key) => StringUtil.camelToSnakeCase(key))
    const valueKeys = Object.keys(plainObject).map((item) => `@${item}`)
    const sql = `INSERT INTO "${this.tableName}" (${keys}) VALUES (${valueKeys})`
    const db = this.acquire()
    return db
      .run(sql, plainObject)
      .then((runResult) => runResult.lastInsertRowid as number)
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 批量保存
   * @param entities 待插入的数据
   * @param ignore 是否使用ignore关键字
   */
  public async saveBatch(entities: Model[], ignore?: boolean): Promise<number> {
    if (!arrayNotEmpty(entities)) {
      LogUtil.warn(this.childClassName, '批量保存的对象不能为空')
      return 0
    }

    // 对齐所有属性
    // 设置createTime和updateTime
    let plainObject = entities.map((entity) => {
      entity.createTime = Date.now()
      entity.updateTime = Date.now()
      // 转换为sqlite3接受的数据类型
      return toObjAcceptedBySqlite3(entity)
    })
    plainObject = ObjectUtil.alignProperties(plainObject, null)
    // 按照第一个对象的属性设置insert子句的value部分
    const keys = Object.keys(plainObject[0])
      // .filter((key) => 'id' !== key)
      .map((key) => StringUtil.camelToSnakeCase(key))
    let insertClause: string
    if (isNullish(ignore) || !ignore) {
      insertClause = `INSERT INTO "${this.tableName}" (${keys})`
    } else {
      insertClause = `INSERT OR IGNORE INTO "${this.tableName}" (${keys})`
    }
    const valuesClauses: string[] = []

    // 存储编号后的所有属性
    let numberedProperties = {}

    let index = 0
    plainObject.forEach((entity) => {
      // 给对象的属性编号，放进新的对象中
      const tempNumberedProperties = Object.fromEntries(
        Object.entries(entity).map(([key, value]) => [
          StringUtil.camelToSnakeCase(key).concat(String(index)),
          value
        ])
      )

      // 获取values子句
      valuesClauses.push(
        Object.keys(tempNumberedProperties)
          .map((key) => '@'.concat(key))
          .join()
      )

      // 编号后的对象的所有属性放进一个对象中
      numberedProperties = { ...numberedProperties, ...tempNumberedProperties }

      index++
    })

    const valuesClause =
      'VALUES ' + valuesClauses.map((valuesClause) => '('.concat(valuesClause, ')')).join()

    const statement = insertClause.concat(' ', valuesClause)

    const db = this.acquire()
    return db
      .run(statement, numberedProperties)
      .then((runResult) => runResult.changes)
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 删除
   * @param id
   */
  public async deleteById(id: PrimaryKey): Promise<number> {
    const sql = `DELETE FROM "${this.tableName}" WHERE "${this.getPrimaryKeyColumnName()}" = ${id}`
    const db = this.acquire()
    return db
      .run(sql)
      .then((runResult) => runResult.changes)
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 批量删除
   * @param ids id列表
   */
  public async deleteBatchById(ids: PrimaryKey[]): Promise<number> {
    if (!arrayNotEmpty(ids)) {
      LogUtil.warn(this.childClassName, '批量删除时id列表不能为空')
      return 0
    }
    const idsStr = ids.join(',')
    const sql = `DELETE FROM "${this.tableName}" WHERE "${this.getPrimaryKeyColumnName()}" in (${idsStr})`
    const db = this.acquire()
    return db
      .run(sql)
      .then((runResult) => runResult.changes)
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 更新
   * @param id
   * @param updateData
   */
  public async updateById(id: PrimaryKey, updateData: Model): Promise<number> {
    assertNotNullish(id, this.childClassName, '更新时主键不能为空')
    // 设置createTime和updateTime
    updateData.updateTime = Date.now()

    // 生成一个不包含值为undefined的属性的对象
    const existingValue = toObjAcceptedBySqlite3(updateData)
    const keys = Object.keys(existingValue)
    const setClauses = keys.map((item) => `${StringUtil.camelToSnakeCase(item)} = @${item}`)
    const statement = `UPDATE "${this.tableName}" SET ${setClauses} WHERE "${this.getPrimaryKeyColumnName()}" = ${id}`
    const db = this.acquire()
    return db
      .run(statement, existingValue)
      .then((runResult) => runResult.changes)
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 批量更新
   * @param entities
   */
  public async updateBatchById(entities: Model[]): Promise<number> {
    const db = this.acquire()
    try {
      if (isNullish(entities) || entities.length === 0) {
        throw new Error('保存的对象不能为空')
      }

      // 对齐所有属性
      // 设置createTime和updateTime
      let plainObjects = entities.map((entity) => {
        entity.updateTime = Date.now()
        // 转换为sqlite3接受的数据类型
        return toObjAcceptedBySqlite3(entity)
      })
      plainObjects = ObjectUtil.alignProperties(plainObjects, null)
      // 按照第一个对象的属性设置update子句的set columns = value部分
      const keys = Object.keys(plainObjects[0])
      const setClauses = keys.map((key) => `${StringUtil.camelToSnakeCase(key)} = @${key}`)
      const statement = `UPDATE "${this.tableName}" SET ${setClauses}`

      for (const plainObject of plainObjects) {
        await db.run(statement, plainObject)
      }
      return entities.length
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  /**
   * 批量新增或更新
   * @param entities
   */
  public async saveOrUpdateBatchById(entities: Model[]): Promise<number> {
    if (isNullish(entities) || entities.length === 0) {
      throw new Error('保存的对象不能为空')
    }

    // 对齐所有属性
    // 设置createTime和updateTime
    let plainObject = entities.map((entity) => {
      entity.createTime = Date.now()
      entity.updateTime = Date.now()
      // 转换为sqlite3接受的数据类型
      return toObjAcceptedBySqlite3(entity)
    })
    plainObject = ObjectUtil.alignProperties(plainObject, null)
    // 按照第一个对象的属性设置insert子句的value部分
    const keys = Object.keys(plainObject[0])
      // .filter((key) => 'id' !== key)
      .map((key) => StringUtil.camelToSnakeCase(key))
    const insertClause = `INSERT OR REPLACE INTO "${this.tableName}" (${keys})`
    const valuesClauses: string[] = []

    // 存储编号后的所有属性
    let numberedProperties = {}

    let index = 0
    plainObject.forEach((entity) => {
      // 给对象的属性编号，放进新的对象中
      const tempNumberedProperties = Object.fromEntries(
        Object.entries(entity).map(([key, value]) => [
          StringUtil.camelToSnakeCase(key).concat(String(index)),
          value
        ])
      )

      // 获取values子句
      valuesClauses.push(
        Object.keys(tempNumberedProperties)
          .map((key) => '@'.concat(key))
          .join()
      )

      // 编号后的对象的所有属性放进一个对象中
      numberedProperties = { ...numberedProperties, ...tempNumberedProperties }

      index++
    })

    const valuesClause =
      'VALUES ' + valuesClauses.map((valuesClause) => '('.concat(valuesClause, ')')).join()

    const statement = insertClause.concat(' ', valuesClause)

    const db = this.acquire()
    return db
      .run(statement, numberedProperties)
      .then((runResult) => runResult.changes)
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 主键查询
   * @param id
   */
  public async getById(id: PrimaryKey): Promise<Model | undefined> {
    const statement = `select * from ${this.tableName} where ${this.getPrimaryKeyColumnName()} = @${this.getPrimaryKeyColumnName()}`
    const db = this.acquire()
    return db
      .get<unknown[], Record<string, unknown>>(statement, {
        [this.getPrimaryKeyColumnName()]: id
      })
      .then((result) => {
        if (notNullish(result)) {
          return this.getResultTypeData<Model>(result)
        } else {
          return undefined
        }
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 分页查询
   * @param page
   */
  public async queryPage(page: PageModel<Query, Model>): Promise<PageModel<Query, Model>> {
    // 生成where字句
    let whereClause
    const modifiedPage = new PageModel(page)
    if (page.query) {
      const whereClauseAndQuery = this.getWhereClause(page.query)
      whereClause = whereClauseAndQuery.whereClause

      // modifiedPage存储修改过的查询条件
      modifiedPage.query = whereClauseAndQuery.query
    }

    // 拼接查询语句
    let statement = `SELECT * FROM "${this.tableName}"`
    if (whereClause !== undefined) {
      statement = statement.concat(' ', whereClause)
    }
    // 拼接排序和分页字句
    statement = await this.sorterAndPager(statement, whereClause, modifiedPage)

    // 查询
    const query = modifiedPage.query?.getQueryObject()
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, query === undefined ? {} : query)
      .then((rows) => {
        // 结果集中的元素的属性名从snakeCase转换为camelCase，并赋值给page.data
        modifiedPage.data = this.getResultTypeDataList<Model>(rows)
        return modifiedPage
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 查询列表
   * @param query
   */
  public async list(query?: Query): Promise<Model[]> {
    let statement = `SELECT * FROM "${this.tableName}"`
    // 生成where字句
    let modifiedQuery = lodash.cloneDeep(query)
    if (modifiedQuery !== undefined) {
      const whereClauseAndQuery = this.getWhereClause(modifiedQuery)
      const whereClause = whereClauseAndQuery.whereClause
      modifiedQuery = whereClauseAndQuery.query

      // 拼接查询语句
      if (whereClause !== undefined) {
        statement = statement.concat(' ', whereClause)
      }

      // 拼接排序字句
      if (modifiedQuery !== undefined) {
        statement = this.sorter(statement, modifiedQuery.sort)
      }
    }

    // 查询
    const nonUndefinedValue = ObjectUtil.nonUndefinedValue(modifiedQuery?.getQueryObject())
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement, nonUndefinedValue)
      .then((rows) => this.getResultTypeDataList<Model>(rows))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 根据id列表查询
   * @param ids id列表
   */
  public async listByIds(ids: number[] | string[]): Promise<Model[]> {
    const idStr = ids.join(',')
    const statement = `SELECT * FROM "${this.tableName}" WHERE ${this.getPrimaryKeyColumnName()} IN (${idStr})`
    // 生成where字句

    // 查询
    const db = this.acquire()
    return db
      .all<unknown[], Record<string, unknown>>(statement)
      .then((rows) => this.getResultTypeDataList<Model>(rows))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 查询SelectItem列表
   */
  public async baseListSelectItems(
    query: Query,
    valueName: string,
    labelName: string,
    secondaryLabelName?: string
  ): Promise<SelectItem[]> {
    const db = this.acquire()
    // 拼接select子句
    let selectClause: string
    const valueCol = StringUtil.camelToSnakeCase(valueName)
    const labelCol = StringUtil.camelToSnakeCase(labelName)
    let secondaryLabelCol: string | undefined
    if (secondaryLabelName !== undefined) {
      secondaryLabelCol = StringUtil.camelToSnakeCase(secondaryLabelName)
      selectClause = `select ${valueCol} as "value", ${labelCol} as label, ${secondaryLabelCol} as secondaryLabel from ${this.tableName}`
    } else {
      selectClause = `select ${valueCol} as "value", ${labelCol} as label from ${this.tableName}`
    }

    // 拼接where子句
    const whereClauseAndQuery = this.getWhereClause(query)
    const modifiedQuery = whereClauseAndQuery.query

    // 拼接sql语句
    let statement = selectClause
    if (whereClauseAndQuery.whereClause !== undefined) {
      statement = statement.concat(' ', whereClauseAndQuery.whereClause)
    }

    // 查询
    const queryObj = modifiedQuery?.getQueryObject()
    return db
      .all<unknown[], SelectItem>(statement, queryObj === undefined ? {} : queryObj)
      .then((rows) => rows.map((row) => new SelectItem(row)))
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 分页查询SelectItem
   */
  public async querySelectItemPage(
    page: PageModel<Query, Model>,
    valueName: string,
    labelName: string,
    secondaryLabelName?: string
  ): Promise<PageModel<Query, SelectItem>> {
    // 拼接select子句
    let selectClause: string
    const valueCol = StringUtil.camelToSnakeCase(valueName)
    const labelCol = StringUtil.camelToSnakeCase(labelName)
    let secondaryLabelCol: string | undefined
    if (secondaryLabelName !== undefined) {
      secondaryLabelCol = StringUtil.camelToSnakeCase(secondaryLabelName)
      selectClause = `select ${valueCol} as "value", ${labelCol} as label, ${secondaryLabelCol} as secondaryLabel
                        from ${this.tableName}`
    } else {
      selectClause = `select ${valueCol} as "value", ${labelCol} as label
                        from ${this.tableName}`
    }

    // 拼接where子句
    page = new PageModel<Query, Model>(page)
    const whereClauseAndQuery = this.getWhereClause(page.query)

    // 创建一个新的PageModel实例存储修改过的查询条件
    const modifiedPage = new PageModel(page)
    modifiedPage.query = whereClauseAndQuery.query

    const whereClause = whereClauseAndQuery.whereClause
    let statement = selectClause
    if (whereClause !== undefined) {
      statement = selectClause.concat(' ', whereClause)
    }

    // 分页和排序
    statement = await this.sorterAndPager(statement, whereClause, modifiedPage)

    // 查询
    const query = modifiedPage.query?.getQueryObject()
    const db = this.acquire()
    return db
      .all<unknown[], SelectItem>(statement, query === undefined ? {} : query)
      .then((rows) => {
        const selectItems = rows.map((row) => new SelectItem(row))
        const result = modifiedPage.transform<SelectItem>()
        result.data = selectItems
        return result
      })
      .finally(() => {
        if (!this.injectedDB) {
          db.release()
        }
      })
  }

  /**
   * 拼接where字句
   * @protected
   * @param whereClauses
   */
  protected splicingWhereClauses(whereClauses: string[]): string | undefined {
    if (whereClauses.length > 0) {
      return `where ${whereClauses.length > 1 ? whereClauses.join(' and ') : whereClauses[0]}`
    } else {
      return undefined
    }
  }

  /**
   * 获取where字句
   * @protected
   * @param queryConditions
   * @param alias
   */
  protected getWhereClause(
    queryConditions: Query | undefined,
    alias?: string
  ): { whereClause: string | undefined; query: Query | undefined } {
    if (queryConditions === undefined) {
      return { whereClause: undefined, query: undefined }
    }

    const whereClauses: string[] = []
    // 确认运算符后被修改的匹配值（比如like运算符在前后增加%）
    const modifiedQuery: Query = Object.assign(new BaseQueryDTO(), queryConditions)
    // 去除值为undefined的属性和assignComparator属性
    Object.entries(queryConditions)
      .filter(
        ([key, value]) =>
          value !== undefined &&
          (typeof value === 'string' ? StringUtil.isNotBlank(value) : true) &&
          key !== 'assignComparator' &&
          key !== 'keyword' &&
          key !== 'sort'
      )
      .forEach(([key, value]) => {
        const snakeCaseKey = StringUtil.camelToSnakeCase(key)
        const comparator = this.getComparator(key, queryConditions.assignComparator)
        // 根据运算符的不同给出不同的where子句和匹配值
        let modifiedValue: unknown
        let whereClause: string
        switch (comparator) {
          case COMPARATOR.EQUAL:
            if (value !== null) {
              whereClause =
                alias == undefined
                  ? `"${snakeCaseKey}" ${comparator} @${key}`
                  : `${alias}."${snakeCaseKey}" ${comparator} @${key}`
              modifiedValue = value
            } else {
              whereClause =
                alias == undefined
                  ? `"${snakeCaseKey}" ${COMPARATOR.IS_NULL}`
                  : `${alias}."${snakeCaseKey}" ${COMPARATOR.IS_NULL}`
            }
            break
          case COMPARATOR.NOT_EQUAL:
            if (value !== null) {
              whereClause =
                alias == undefined
                  ? `"(${snakeCaseKey}" ${COMPARATOR.NOT_EQUAL} @${key} OR "${snakeCaseKey}" ${COMPARATOR.IS_NULL})`
                  : `(${alias}."${snakeCaseKey}" ${COMPARATOR.NOT_EQUAL} @${key} OR ${alias}."${snakeCaseKey}" ${COMPARATOR.IS_NULL})`
              modifiedValue = value
            } else {
              whereClause =
                alias == undefined
                  ? `"${snakeCaseKey}" ${COMPARATOR.IS_NOT_NULL}`
                  : `${alias}."${snakeCaseKey}" ${COMPARATOR.IS_NOT_NULL}`
            }
            break
          case COMPARATOR.LEFT_LIKE:
            whereClause =
              alias == undefined
                ? `"${snakeCaseKey}" ${COMPARATOR.LIKE} @${key}`
                : `${alias}."${snakeCaseKey}" ${COMPARATOR.LIKE} @${key}`
            modifiedValue = value
            break
          case COMPARATOR.RIGHT_LIKE:
            whereClause =
              alias == undefined
                ? `"${snakeCaseKey}" ${COMPARATOR.LIKE} @${key}`
                : `${alias}."${snakeCaseKey}" ${COMPARATOR.LIKE} @${key}`
            modifiedValue = '%'.concat(value)
            break
          case COMPARATOR.LIKE:
            whereClause =
              alias == undefined
                ? `"${snakeCaseKey}" ${comparator} @${key}`
                : `${alias}."${snakeCaseKey}" ${comparator} @${key}`
            modifiedValue = '%'.concat(value, '%')
            break
          default:
            whereClause =
              alias == undefined
                ? `"${snakeCaseKey}" ${comparator} @${key}`
                : `${alias}."${snakeCaseKey}" ${comparator} @${key}`
            modifiedValue = value
        }
        whereClauses.push(whereClause)
        modifiedQuery[key] = modifiedValue
      })

    const whereClause = this.splicingWhereClauses(whereClauses)
    return { whereClause: whereClause, query: modifiedQuery as Query }
  }

  /**
   * 获取属性名为键，where字句为值的Record对象
   * @param queryConditions 查询条件
   * @param alias 所查询数据表的别名
   * @protected
   * @return 属性名为键，where字句为值的Record对象
   */
  protected getWhereClauses(
    queryConditions: Query,
    alias?: string
  ): {
    whereClauses: Record<string, string>
    query: Query
  } {
    const whereClauses: Record<string, string> = {}
    // 确认运算符后被修改的匹配值（比如like运算符在前后增加%）
    const modifiedQuery = Object.assign(queryConditions, queryConditions)
    if (queryConditions) {
      // 去除值为undefined的属性和assignComparator、keyword属性
      Object.entries(queryConditions)
        .filter(
          ([key, value]) =>
            value !== undefined &&
            (typeof value === 'string' ? StringUtil.isNotBlank(value) : true) &&
            key !== 'assignComparator' &&
            key !== 'keyword' &&
            key !== 'sort'
        )
        .forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            const snakeCaseKey = StringUtil.camelToSnakeCase(key)
            const comparator = this.getComparator(key, queryConditions.assignComparator)
            // 根据运算符的不同给出不同的where子句和匹配值
            let modifiedValue
            switch (comparator) {
              case COMPARATOR.EQUAL:
                if (value !== null) {
                  whereClauses[key] =
                    alias == undefined
                      ? `"${snakeCaseKey}" ${comparator} @${key}`
                      : `${alias}."${snakeCaseKey}" ${comparator} @${key}`
                  modifiedValue = value
                } else {
                  whereClauses[key] =
                    alias == undefined
                      ? `"${snakeCaseKey}" ${COMPARATOR.IS_NULL}`
                      : `${alias}."${snakeCaseKey}" ${COMPARATOR.IS_NULL}`
                }
                break
              case COMPARATOR.NOT_EQUAL:
                if (value !== null) {
                  whereClauses[key] =
                    alias == undefined
                      ? `"(${snakeCaseKey}" ${COMPARATOR.NOT_EQUAL} @${key} OR "${snakeCaseKey}" ${COMPARATOR.IS_NULL})`
                      : `(${alias}."${snakeCaseKey}" ${COMPARATOR.NOT_EQUAL} @${key} OR ${alias}."${snakeCaseKey}" ${COMPARATOR.IS_NULL})`
                  modifiedValue = value
                } else {
                  whereClauses[key] =
                    alias == undefined
                      ? `"${snakeCaseKey}" ${COMPARATOR.IS_NOT_NULL}`
                      : `${alias}."${snakeCaseKey}" ${COMPARATOR.IS_NOT_NULL}`
                }
                break
              case COMPARATOR.LEFT_LIKE:
                whereClauses[key] =
                  alias == undefined
                    ? `"${snakeCaseKey}" ${COMPARATOR.LIKE} @${key}`
                    : `${alias}."${snakeCaseKey}" ${COMPARATOR.LIKE} @${key}`
                modifiedValue = String(value).concat('%')
                break
              case COMPARATOR.RIGHT_LIKE:
                whereClauses[key] =
                  alias == undefined
                    ? `"${snakeCaseKey}" ${COMPARATOR.LIKE} @${key}`
                    : `${alias}."${snakeCaseKey}" ${COMPARATOR.LIKE} @${key}`
                modifiedValue = '%'.concat(value)
                break
              case COMPARATOR.LIKE:
                whereClauses[key] =
                  alias == undefined
                    ? `"${snakeCaseKey}" ${comparator} @${key}`
                    : `${alias}."${snakeCaseKey}" ${comparator} @${key}`
                modifiedValue = '%'.concat(value, '%')
                break
              default:
                whereClauses[key] =
                  alias == undefined
                    ? `"${snakeCaseKey}" ${comparator} @${key}`
                    : `${alias}."${snakeCaseKey}" ${comparator} @${key}`
                modifiedValue = value
            }
            modifiedQuery[key] = modifiedValue
          }
        })
    }

    return { whereClauses: whereClauses, query: modifiedQuery as Query }
  }

  /**
   * 获取运算符
   * @param property
   * @param assignComparator
   * @private
   */
  private getComparator(
    property: string,
    assignComparator: { [key: string]: COMPARATOR } | undefined
  ): COMPARATOR {
    // 指定运算符的对象转换为数组
    const assignComparatorList =
      assignComparator === undefined ? undefined : Object.entries(assignComparator)
    let comparator = COMPARATOR.EQUAL
    if (assignComparatorList !== undefined && assignComparatorList.length > 0) {
      const comparatorTarget = assignComparatorList.filter((item) => item[0] === property)
      if (comparatorTarget.length > 0) {
        comparator = comparatorTarget[0][1]
      }
    }
    return comparator
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
    whereClause: string | undefined,
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
    whereClause: string | undefined,
    page: PageModel<Query, Model>,
    fromClause?: string
  ): Promise<string> {
    const db = this.acquire()
    try {
      if (StringUtil.isNotBlank(fromClause)) {
        fromClause = StringUtil.removePrefixIfPresent(fromClause as string, 'from ')
      } else {
        fromClause = this.tableName
      }
      // 查询数据总量，计算页码数量
      const notNullishValue = toObjAcceptedBySqlite3(page.query)
      let countSql = `SELECT COUNT(*) AS total FROM ${fromClause}`
      if (whereClause !== undefined) {
        const tempWhereClause = StringUtil.concatPrefixIfNotPresent(whereClause, 'where ')
        countSql = countSql.concat(' ', tempWhereClause)
      }
      const countResult = (await db.get(countSql, notNullishValue)) as { total: number }
      page.dataCount = countResult.total
      page.pageCount = Math.ceil(countResult.total / page.pageSize)

      // 计算偏移量
      const offset = (page.pageNumber - 1) * page.pageSize

      return `LIMIT ${page.pageSize} OFFSET ${offset}`
    } finally {
      if (!this.injectedDB) {
        db.release()
      }
    }
  }

  /**
   * 为查询语句附加排序字句（为第一个参数statement末端拼接排序字句并返回）
   * @param statement 需要分页的语句
   * @param sortOption
   * @protected
   */
  protected sorter(statement: string, sortOption?: QuerySortOption[]): string {
    if (sortOption === undefined) {
      return statement
    }
    const sortClause = this.getSortClause(sortOption)
    statement = statement.concat(' ', sortClause)
    return statement
  }

  /**
   * 获取排序字句
   * @protected
   * @param sortOption
   */
  protected getSortClause(sortOption: QuerySortOption[]): string {
    let sortClauses: string
    sortClauses = sortOption
      .filter((item) => item.asc === 'asc' || item.asc === 'desc')
      .map((item) => {
        item.column = StringUtil.camelToSnakeCase(item.column)
        return item.column.concat(' ', item.asc)
      })
      .join(',')
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
    whereClause: string | undefined,
    page: PageModel<Query, Model>,
    fromClause?: string
  ): Promise<string> {
    statement = this.sorter(statement, page.query?.sort)
    statement = await this.pager(statement, whereClause, page, fromClause)
    return statement
  }

  /**
   * 以元素的属性名为snakeCase格式的dataList为原型，返回一个Result类型的数组
   * @param dataList
   * @protected
   */
  protected getResultTypeDataList<Result>(dataList: Record<string, unknown>[]): Result[] {
    return dataList.map((row) => this.getResultTypeData(row))
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
