import BaseEntity, { Id } from '@shared/model/base/BaseEntity.ts'
import BaseQueryDTO from '@shared/model/base/BaseQueryDTO.ts'
import { ToObjAcceptedBySqlite3, toPlainParams } from '../util/DatabaseUtil.ts'
import SelectItem from '@shared/model/util/SelectItem.ts'
import lodash from 'lodash'
import { arrayNotEmpty, isNullish, notNullish } from '@shared/util/CommonUtil.ts'
import { assertArrayNotEmpty, assertFalse, assertNotNullish } from '@shared/util/AssertUtil.ts'
import Page from '@shared/model/util/Page.js'
import CoreDao from '../core/CoreDao.ts'
import ForeignKeyConstraintError from '../error/ForeignKeyConstraintError.js'
import ForeignKeyDeleteError from '../error/ForeignKeyDeleteError.js'
import { camelToSnakeCase } from '@shared/util/StringUtil.ts'
import { alignProperties, nonUndefinedValue } from '@shared/util/ObjectUtil.ts'
import { Database } from '../database/Database.ts'

type PrimaryKey = string | number

/**
 * Dao基类
 */
export default abstract class BaseDao<Query extends BaseQueryDTO, Model extends BaseEntity> extends CoreDao<Query, Model> {
  /**
   * 数据表名
   * @protected
   */
  protected tableName: string

  /**
   * 实体类的构造函数
   * @protected
   */
  protected entityConstr: new (src?: Model) => Model

  protected constructor(tableName: string, entityConstr: new (src?: Model) => Model) {
    super()
    this.entityConstr = entityConstr
    this.tableName = tableName
  }

  /**
   * 保存
   * @param entity
   */
  public async save(entity: Model): Promise<number> {
    const standardEntity = new this.entityConstr(entity)
    // 设置createTime和updateTime
    standardEntity.createTime = Date.now()
    standardEntity.updateTime = Date.now()

    // 转换为sqlite3接受的数据类型
    const plainObject = ToObjAcceptedBySqlite3(standardEntity)

    const keys = Object.keys(plainObject).map((key) => camelToSnakeCase(key))
    const valueKeys = Object.keys(plainObject).map((item) => `@${item}`)
    const statement = `INSERT INTO "${this.tableName}" (${keys}) VALUES (${valueKeys})`
    const runResult = await Database.run(statement, plainObject)
    return runResult.lastInsertRowid as number
  }

  /**
   * 批量保存
   * @param entities 待插入的数据
   * @param ignore 是否使用ignore关键字
   */
  public async saveBatch(entities: Model[], ignore?: boolean): Promise<number> {
    assertArrayNotEmpty(entities, '批量保存的对象不能为空')
    const standardEntities = entities.map((entity) => new this.entityConstr(entity))

    // 对齐所有属性
    // 设置createTime和updateTime
    let plainObject = standardEntities.map((entity) => {
      entity.createTime = Date.now()
      entity.updateTime = Date.now()
      // 转换为sqlite3接受的数据类型
      return ToObjAcceptedBySqlite3(entity)
    })
    plainObject = alignProperties(plainObject, null)
    // 按照第一个对象的属性设置insert子句的value部分
    const columns = Object.keys(plainObject[0]).map((key) => camelToSnakeCase(key))
    let insertClause: string
    if (isNullish(ignore) || !ignore) {
      insertClause = `INSERT INTO "${this.tableName}" (${columns})`
    } else {
      insertClause = `INSERT OR IGNORE INTO "${this.tableName}" (${columns})`
    }
    const valuesClauses: string[] = []

    // 存储编号后的所有属性
    let numberedProperties = {}

    let index = 0
    plainObject.forEach((entity) => {
      // 给对象的属性编号，放进新的对象中
      const tempNumberedProperties = Object.fromEntries(
        Object.entries(entity).map(([key, value]) => [camelToSnakeCase(key).concat(String(index)), value])
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

    const valuesClause = 'VALUES ' + valuesClauses.map((valuesClause) => '('.concat(valuesClause, ')')).join()

    const statement = insertClause.concat(' ', valuesClause)

    const runResult = await Database.run(statement, plainObject)
    return runResult.changes
  }

  /**
   * 删除
   * @param id
   */
  public async deleteById(id: PrimaryKey): Promise<number> {
    const statement = `DELETE FROM "${this.tableName}" WHERE "${BaseEntity.PK}" = ${id}`
    try {
      const runResult = await Database.run(statement)
      return runResult.changes
    } catch (error) {
      if (ForeignKeyConstraintError.isForeignKeyConstraintError(error)) {
        throw new ForeignKeyDeleteError(error.message, error, statement, null, this.tableName)
      } else {
        throw error
      }
    }
  }

  /**
   * 删除
   * @param query
   */
  public async delete(query: Query): Promise<number> {
    let statement = `DELETE FROM "${this.tableName}"`
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
    let plainParams: Record<string, unknown> | undefined = undefined
    if (notNullish(modifiedQuery)) {
      plainParams = toPlainParams(modifiedQuery)
    }
    // 查询
    const nonUndefined = nonUndefinedValue(plainParams)
    try {
      const runResult = await Database.run(statement, nonUndefined)
      return runResult.changes
    } catch (error) {
      if (ForeignKeyConstraintError.isForeignKeyConstraintError(error)) {
        throw new ForeignKeyDeleteError(error.message, error, statement, null, this.tableName)
      } else {
        throw error
      }
    }
  }

  /**
   * 批量删除
   * @param ids id列表
   */
  public async deleteBatchById(ids: PrimaryKey[]): Promise<number> {
    assertArrayNotEmpty(ids, '批量删除失败，id列表不能为空')

    const idsStr = ids.join(',')
    const statement = `DELETE FROM "${this.tableName}" WHERE "${BaseEntity.PK}" IN (${idsStr})`
    try {
      const runResult = await Database.run(statement)
      return runResult.changes
    } catch (error) {
      if (ForeignKeyConstraintError.isForeignKeyConstraintError(error)) {
        throw new ForeignKeyDeleteError(error.message, error, statement, null, this.tableName)
      } else {
        throw error
      }
    }
  }

  /**
   * 更新
   * @param entity
   */
  public async updateById(entity: Model): Promise<number> {
    assertNotNullish(entity.id, '更新失败，主键不能为空')
    const standardEntity = new this.entityConstr(entity)
    // 设置createTime和updateTime
    standardEntity.updateTime = Date.now()

    // 生成一个不包含值为undefined的属性的对象
    const existingValue = ToObjAcceptedBySqlite3(standardEntity)
    const keys = Object.keys(existingValue)
    const setClauses = keys.map((item) => `${camelToSnakeCase(item)} = @${item}`)
    const statement = `UPDATE "${this.tableName}" SET ${setClauses} WHERE "${BaseEntity.PK}" = @${BaseEntity.PK}`
    const runResult = await Database.run(statement, existingValue)
    return runResult.changes
  }

  /**
   * 批量更新
   * @param entities
   */
  public async updateBatchById(entities: Model[]): Promise<number> {
    assertArrayNotEmpty(entities, '批量更新失败，更新数据不能为空')
    const hasNullId = entities.some((entity) => isNullish(entity.id))
    assertFalse(hasNullId, '批量更新失败，更新数据中存在id为空的项')
    const standardEntities = entities.map((entity) => new this.entityConstr(entity))

    const ids: Id[] = []
    // 对齐所有属性
    // 设置createTime和updateTime
    let plainObject = standardEntities.map((entity) => {
      entity.updateTime = Date.now()
      //
      if (notNullish(entity.id)) {
        ids.push(entity.id)
      }
      // 转换为sqlite3接受的数据类型
      return ToObjAcceptedBySqlite3(entity)
    })
    plainObject = alignProperties(plainObject, null)
    // 按照第一个对象的属性设置语句的value部分
    const keys = Object.keys(plainObject[0])
    const updateClause = `UPDATE "${this.tableName}"`
    const whereClause = `WHERE ${BaseEntity.PK} IN (${ids.join()})`
    const setClauses: string[] = []

    // 存储编号后的所有属性
    const numberedProperties = {}

    keys.forEach((key) => {
      if (BaseEntity.PK !== key) {
        const whenThenClauses: string[] = []
        const column = camelToSnakeCase(key)
        let index = 0
        plainObject.forEach((obj) => {
          const value = obj[key]
          const numberedProperty = key + index
          if (undefined === value) {
            whenThenClauses.push(`WHEN ${BaseEntity.PK} = ${obj.id} THEN ${column}`)
          } else if (null === value) {
            whenThenClauses.push(`WHEN ${BaseEntity.PK} = ${obj.id} THEN NULL`)
          } else {
            whenThenClauses.push(`WHEN ${BaseEntity.PK} = ${obj.id} THEN @${numberedProperty}`)
            numberedProperties[numberedProperty] = value
          }
          index++
        })
        if (arrayNotEmpty(whenThenClauses)) {
          setClauses.push(column + ' = CASE ' + whenThenClauses.join(' ') + ' END')
        }
      }
    })

    const statement = updateClause + ' SET ' + setClauses.join() + ' ' + whereClause
    const runResult = await Database.run(statement, numberedProperties)
    return runResult.changes
  }

  /**
   * 批量新增或更新
   * @param entities
   * @param conflicts
   */
  public async saveOrUpdateBatchById(entities: Model[], conflicts?: string[][]): Promise<number> {
    assertArrayNotEmpty(entities, '批量保存或更新失败，保存数据不能为空')
    const standardEntities = entities.map((entity) => new this.entityConstr(entity))

    // 对齐所有属性
    // 设置createTime和updateTime
    let plainObject = standardEntities.map((entity) => {
      entity.createTime = Date.now()
      entity.updateTime = Date.now()
      // 转换为sqlite3接受的数据类型
      return ToObjAcceptedBySqlite3(entity)
    })
    plainObject = alignProperties(plainObject, null)
    // 按照第一个对象的属性设置insert子句的value部分
    const columns = Object.keys(plainObject[0]).map((key) => camelToSnakeCase(key))
    const insertClause = `INSERT INTO "${this.tableName}" (${columns})`
    const finalConflicts: string[][] = [[BaseEntity.PK]]
    if (arrayNotEmpty(conflicts)) {
      finalConflicts.push(...conflicts)
    }
    const excludedClauses = finalConflicts.map((conflict) => {
      const excludedClause = columns
        .filter((column) => BaseEntity.PK !== column && BaseEntity.CREATE_TIME !== column && !conflict?.includes(column))
        .map((column) => `${column} = EXCLUDED.${column}`)
      return `ON CONFLICT(${conflict.join()}) DO UPDATE SET ${excludedClause.join(',')}`
    })
    const valuesClauses: string[] = []

    // 存储编号后的所有属性
    let numberedProperties = {}

    let index = 0
    plainObject.forEach((entity) => {
      // 给对象的属性编号，放进新的对象中
      const tempNumberedProperties = Object.fromEntries(
        Object.entries(entity).map(([key, value]) => [camelToSnakeCase(key) + String(index), value])
      )

      // 获取values子句
      valuesClauses.push(
        Object.keys(tempNumberedProperties)
          .map((key) => `@${key}`)
          .join()
      )

      // 编号后的对象的所有属性放进一个对象中
      numberedProperties = { ...numberedProperties, ...tempNumberedProperties }

      index++
    })

    const valuesClause = 'VALUES ' + valuesClauses.map((valuesClause) => `(${valuesClause})`).join()

    const statement = insertClause + ' ' + valuesClause + ' ' + excludedClauses.join(' ')

    const runResult = await Database.run(statement, numberedProperties)
    return runResult.changes
  }

  /**
   * 主键查询
   * @param id
   */
  public async getById(id: PrimaryKey): Promise<Model | undefined> {
    const statement = `SELECT * FROM ${this.tableName} WHERE ${BaseEntity.PK} = @${BaseEntity.PK}`
    const result = await Database.get<unknown[], Record<string, unknown>>(statement, { [BaseEntity.PK]: id })
    if (notNullish(result)) {
      return this.toResultTypeData<Model>(result)
    } else {
      return undefined
    }
  }

  /**
   * 查询列表
   * @param query
   */
  public async get(query?: Query): Promise<Model | undefined> {
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
    let plainParams: Record<string, unknown> | undefined = undefined
    if (notNullish(modifiedQuery)) {
      plainParams = toPlainParams(modifiedQuery)
    }
    // 查询
    const nonUndefined = nonUndefinedValue(plainParams)
    const result = await Database.get<unknown[], Record<string, unknown>>(statement, nonUndefined)
    if (notNullish(result)) {
      return this.toResultTypeData<Model>(result)
    } else {
      return undefined
    }
  }

  /**
   * 分页查询
   * @param page
   */
  public async queryPage(page: Page<Query, Model>): Promise<Page<Query, Model>> {
    // 生成where字句
    let whereClause: string | undefined
    const modifiedPage = new Page(page)
    if (page.query) {
      const whereClauseAndQuery = this.getWhereClause(page.query, undefined, BaseQueryDTO.nonFieldProperties())
      whereClause = whereClauseAndQuery.whereClause

      // 修改过的查询条件
      modifiedPage.query = whereClauseAndQuery.query
    }

    // 拼接查询语句
    let statement = `SELECT * FROM "${this.tableName}"`
    if (whereClause !== undefined) {
      statement = statement.concat(' ', whereClause)
    }
    // 拼接排序和分页字句
    const sort = isNullish(page.query?.sort) ? [] : page.query.sort
    statement = await this.sortAndPage(statement, modifiedPage, sort, this.tableName)
    if (modifiedPage.currentCount < 1) {
      modifiedPage.data = []
      return modifiedPage
    }

    // 查询
    let plainParams: Record<string, unknown> | undefined = undefined
    if (notNullish(modifiedPage.query)) {
      plainParams = toPlainParams(modifiedPage.query)
    }
    const rows = await Database.all<unknown[], Record<string, unknown>>(statement, plainParams)
    // 结果集中的元素的属性名从snakeCase转换为camelCase，并赋值给page.data
    modifiedPage.data = this.toResultTypeDataList<Model>(rows)
    return modifiedPage
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
    let plainParams: Record<string, unknown> | undefined = undefined
    if (notNullish(modifiedQuery)) {
      plainParams = toPlainParams(modifiedQuery)
    }
    // 查询
    const nonUndefined = nonUndefinedValue(plainParams)
    const rows = await Database.all<unknown[], Record<string, unknown>>(statement, nonUndefined)
    return this.toResultTypeDataList<Model>(rows)
  }

  /**
   * 根据id列表查询
   * @param ids id列表
   */
  public async listByIds(ids: number[] | string[]): Promise<Model[]> {
    const idStr = ids.join(',')
    const statement = `SELECT * FROM "${this.tableName}" WHERE ${BaseEntity.PK} IN (${idStr})`
    // 生成where字句

    // 查询
    const rows = await Database.all<unknown[], Record<string, unknown>>(statement)
    return this.toResultTypeDataList<Model>(rows)
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
    // 拼接select子句
    let selectClause: string
    const valueCol = camelToSnakeCase(valueName)
    const labelCol = camelToSnakeCase(labelName)
    let secondaryLabelCol: string | undefined
    if (secondaryLabelName !== undefined) {
      secondaryLabelCol = camelToSnakeCase(secondaryLabelName)
      selectClause = `SELECT ${valueCol} AS "value", ${labelCol} AS label, ${secondaryLabelCol} AS secondaryLabel FROM ${this.tableName}`
    } else {
      selectClause = `SELECT ${valueCol} AS "value", ${labelCol} AS label FROM ${this.tableName}`
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
    const queryObj = toPlainParams(modifiedQuery)
    const rows = await Database.all<unknown[], SelectItem>(statement, queryObj === undefined ? {} : queryObj)
    return rows.map((row) => new SelectItem(row))
  }

  /**
   * 分页查询SelectItem
   * @param page 分页查询参数
   * @param valueName 标签value的名称
   * @param labelName 标签label的名称
   * @param secondaryLabelName 标签第二标签的名称
   */
  public async querySelectItemPage(
    page: Page<Query, Model>,
    valueName: string,
    labelName: string,
    secondaryLabelName?: string
  ): Promise<Page<Query, SelectItem>> {
    // 拼接select子句
    let selectClause: string
    const valueCol = camelToSnakeCase(valueName)
    const labelCol = camelToSnakeCase(labelName)
    let secondaryLabelCol: string | undefined
    if (secondaryLabelName !== undefined) {
      secondaryLabelCol = camelToSnakeCase(secondaryLabelName)
      selectClause = `SELECT ${valueCol} AS "value", ${labelCol} AS label, ${secondaryLabelCol} AS secondaryLabel
                        FROM ${this.tableName}`
    } else {
      selectClause = `SELECT ${valueCol} AS "value", ${labelCol} AS label
                        FROM ${this.tableName}`
    }

    let whereClause: string | undefined
    const modifiedPage = new Page(page)
    // 拼接where子句
    page = new Page<Query, Model>(page)
    if (notNullish(page.query)) {
      const whereClauseAndQuery = this.getWhereClause(page.query)

      // 修改过的查询条件
      modifiedPage.query = whereClauseAndQuery.query

      whereClause = whereClauseAndQuery.whereClause
    }
    let statement = selectClause
    if (whereClause !== undefined) {
      statement = selectClause + ' ' + whereClause
    }

    // 分页和排序
    const sort = isNullish(page.query?.sort) ? [] : page.query.sort
    statement = await this.sortAndPage(statement, modifiedPage, sort, this.tableName)
    if (modifiedPage.currentCount < 1) {
      const result = modifiedPage.transform<SelectItem>()
      result.data = []
      return result
    }

    // 查询
    let plainParams: Record<string, unknown> | undefined = undefined
    if (notNullish(modifiedPage.query)) {
      plainParams = toPlainParams(modifiedPage.query)
    }
    const rows = await Database.all<unknown[], SelectItem>(statement, plainParams)
    const selectItems = rows.map((row) => new SelectItem(row))
    const result = modifiedPage.transform<SelectItem>()
    result.data = selectItems
    return result
  }
}
