import lodash from 'lodash'
import StringUtil from '../util/StringUtil.js'
import { Operator } from '../constant/CrudConstant.js'
import BaseQueryDTO from './BaseQueryDTO.js'
import Page from '../model/util/Page.js'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish, NotNullish } from '../util/CommonUtil.js'
import { QuerySortOption } from '../constant/QuerySortOption.js'
import DB from '../database/DB.js'
import BaseEntity from './BaseEntity.js'
import LogUtil from '../util/LogUtil.js'

export default class CoreDao<Query extends BaseQueryDTO, Model extends BaseEntity> {
  /**
   * 封装数据库链接实例
   * @private
   */
  protected db: DB | undefined
  /**
   * 是否为注入的链接实例
   * @private
   */
  protected readonly injectedDB: boolean

  protected constructor(db: DB, injectedDB: boolean) {
    this.db = db
    this.injectedDB = injectedDB
  }

  /**
   * 拼接where字句
   * @protected
   * @param whereClauses
   */
  protected splicingWhereClauses(whereClauses: string[]): string {
    if (ArrayNotEmpty(whereClauses)) {
      return `WHERE ${whereClauses.join(' AND ')}`
    } else {
      return ''
    }
  }

  /**
   * 获取where字句
   * @protected
   * @param queryConditions 查询条件
   * @param alias 所查询数据表的别名
   * @param ignore 要忽略的属性名
   * @return where子句和处理后的查询参数
   */
  protected getWhereClause(queryConditions: Query, alias?: string, ignore?: string[]): { whereClause: string; query: Query } {
    const modifiedQuery = this.getWhereClauses(queryConditions, alias, ignore)

    const whereClauses = modifiedQuery.whereClauses

    const whereClause = this.splicingWhereClauses(whereClauses.values().toArray())
    return { whereClause: whereClause, query: modifiedQuery.query }
  }

  /**
   * 获取属性名为键，where字句为值的Record对象
   * @param queryConditions 查询条件
   * @param alias 所查询数据表的别名
   * @param ignore 要忽略的属性名
   * @protected
   * @return 属性名为键，where子句为值的Record对象和处理后的查询参数
   */
  protected getWhereClauses(
    queryConditions: Query,
    alias?: string,
    ignore?: string[]
  ): {
    whereClauses: Map<string, string>
    query: Query
  } {
    const whereClauses: Map<string, string> = new Map<string, string>()
    const modifiedQuery = BaseQueryDTO.toPlainParams(lodash.cloneDeep(queryConditions), ignore)
    // 确认运算符后被修改的查询参数（比如like运算符在前后增加%）
    // 根据每一个属性生成where字句，不包含值为undefined的属性和operators、keyword、sort属性
    Object.entries(modifiedQuery)
      .filter(([, value]) => value !== undefined && (typeof value === 'string' ? StringUtil.isNotBlank(value) : true))
      .forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          const snakeCaseKey = StringUtil.camelToSnakeCase(key)
          const comparator = this.getComparator(key, queryConditions.operators)
          // 根据运算符的不同给出不同的where子句和查询参数
          let modifiedValue: unknown
          switch (comparator) {
            case Operator.EQUAL:
              if (value !== null) {
                whereClauses.set(
                  key,
                  alias == undefined ? `"${snakeCaseKey}" ${comparator} @${key}` : `${alias}."${snakeCaseKey}" ${comparator} @${key}`
                )
                modifiedValue = value
              } else {
                whereClauses.set(
                  key,
                  alias == undefined ? `"${snakeCaseKey}" ${Operator.IS_NULL}` : `${alias}."${snakeCaseKey}" ${Operator.IS_NULL}`
                )
              }
              break
            case Operator.NOT_EQUAL:
              if (value !== null) {
                whereClauses.set(
                  key,
                  alias == undefined
                    ? `"(${snakeCaseKey}" ${Operator.NOT_EQUAL} @${key} OR "${snakeCaseKey}" ${Operator.IS_NULL})`
                    : `(${alias}."${snakeCaseKey}" ${Operator.NOT_EQUAL} @${key} OR ${alias}."${snakeCaseKey}" ${Operator.IS_NULL})`
                )
                modifiedValue = value
              } else {
                whereClauses.set(
                  key,
                  alias == undefined
                    ? `"${snakeCaseKey}" ${Operator.IS_NOT_NULL}`
                    : `${alias}."${snakeCaseKey}" ${Operator.IS_NOT_NULL}`
                )
              }
              break
            case Operator.LEFT_LIKE:
              whereClauses.set(
                key,
                alias == undefined
                  ? `"${snakeCaseKey}" ${Operator.LIKE} @${key}`
                  : `${alias}."${snakeCaseKey}" ${Operator.LIKE} @${key}`
              )
              modifiedValue = value + '%'
              break
            case Operator.RIGHT_LIKE:
              whereClauses.set(
                key,
                alias == undefined
                  ? `"${snakeCaseKey}" ${Operator.LIKE} @${key}`
                  : `${alias}."${snakeCaseKey}" ${Operator.LIKE} @${key}`
              )
              modifiedValue = '%' + value
              break
            case Operator.LIKE:
              whereClauses.set(
                key,
                alias == undefined ? `"${snakeCaseKey}" ${comparator} @${key}` : `${alias}."${snakeCaseKey}" ${comparator} @${key}`
              )
              modifiedValue = '%' + value + '%'
              break
            case Operator.IN:
              if (!Array.isArray(value)) {
                const msg = `生成where子句失败，处理IN条件时比较值不是数组类型`
                LogUtil.error(this.constructor.name, msg)
                throw new Error(msg)
              }
              whereClauses.set(
                key,
                alias == undefined
                  ? `"${snakeCaseKey}" ${comparator} (${value.map((e) => `'${e}'`).join()})`
                  : `${alias}."${snakeCaseKey}" ${comparator} (${value.map((e) => `'${e}'`).join()})`
              )
              modifiedValue = undefined
              break
            default:
              whereClauses.set(
                key,
                alias == undefined ? `"${snakeCaseKey}" ${comparator} @${key}` : `${alias}."${snakeCaseKey}" ${comparator} @${key}`
              )
              modifiedValue = value
          }
          modifiedQuery[key] = modifiedValue
        }
      })

    return { whereClauses: whereClauses, query: Object.assign(BaseQueryDTO.prototype, modifiedQuery) as Query }
  }

  /**
   * 获取运算符
   * @param property
   * @param assignComparator
   * @private
   */
  private getComparator(property: string, assignComparator: { [key: string]: Operator } | undefined): Operator {
    // 指定运算符的对象转换为数组
    const assignComparatorList = assignComparator === undefined ? undefined : Object.entries(assignComparator)
    let comparator = Operator.EQUAL
    if (ArrayNotEmpty(assignComparatorList)) {
      const comparatorTarget = assignComparatorList.find((item) => item[0] === property)
      if (NotNullish(comparatorTarget)) {
        comparator = comparatorTarget[1]
      }
    }
    return comparator
  }

  /**
   * 为查询语句附加分页字句（为第一个参数statement末端拼接分页字句并返回，最后一个参数page的dataCount和pageCount赋值）
   * @param statement 需要分页的语句
   * @param page 分页配置
   * @protected
   */
  protected async pager(statement: string, page: Page<Query, Model>): Promise<string> {
    if (IsNullish(page.paging) || page.paging) {
      statement += ' ' + (await this.getPagingClause(statement, page))
    }
    return statement
  }

  /**
   * 获取分页字句，并给参数page的dataCount和pageCount赋值
   * @param statement 需要分页的语句
   * @param page 分页配置
   * @protected
   */
  protected async getPagingClause(statement: string, page: Page<Query, Model>): Promise<string> {
    if (StringUtil.isBlank(statement)) {
      return statement
    }
    const db = this.acquire()
    try {
      // 查询数据总量，计算页码数量
      let notNullishValue: Record<string, unknown> | undefined = undefined
      if (NotNullish(page.query)) {
        notNullishValue = BaseQueryDTO.toPlainParams(page.query)
      }
      const countSql = `SELECT COUNT(*) AS total FROM (${statement})`
      const countResult = (await db.get(countSql, notNullishValue)) as { total: number }
      page.dataCount = countResult.total
      page.pageCount = Math.ceil(countResult.total / page.pageSize)
      page.currentCount = Math.max(0, page.dataCount - page.pageSize * (page.pageNumber - 1))

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
   * @param sortOption 排序配置
   * @param alias 表别名
   * @protected
   */
  protected sorter(statement: string, sortOption?: QuerySortOption[], alias?: string): string {
    if (sortOption === undefined) {
      return statement
    }
    const sortClause = this.getSortClause(sortOption, alias)
    statement = statement.concat(' ', sortClause)
    return statement
  }

  /**
   * 获取排序字句
   * @protected
   * @param sortOption
   * @param alias
   */
  protected getSortClause(sortOption: QuerySortOption[], alias?: string): string {
    let sortClauses: string
    sortClauses = sortOption
      .map(({ key, asc }) => {
        const tempColumn = StringUtil.camelToSnakeCase(key)
        return IsNullish(alias) ? tempColumn + ' ' + (asc ? 'ASC' : 'DESC') : alias + '.' + tempColumn + ' ' + (asc ? 'ASC' : 'DESC')
      })
      .join(',')
    if (StringUtil.isNotBlank(sortClauses)) {
      sortClauses = 'ORDER BY ' + sortClauses
    }
    return sortClauses
  }

  /**
   * 以元素的属性名为snakeCase格式的dataList为原型，返回一个Result类型的数组
   * @param dataList
   * @protected
   */
  protected toResultTypeDataList<Result>(dataList: Record<string, unknown>[]): Result[] {
    if (ArrayIsEmpty(dataList)) {
      return []
    }
    return dataList.map((row) => this.toResultTypeData(row))
  }

  /**
   * 以元素的属性名为snakeCase格式的data为原型，返回一个Result类型的对象
   * @protected
   * @param data
   */
  protected toResultTypeData<Result>(data: Record<string, unknown>): Result {
    return Object.fromEntries(Object.entries(data).map(([k, v]) => [StringUtil.snakeToCamelCase(k), v])) as Result
  }

  protected acquire() {
    if (this.db === undefined) {
      this.db = new DB(this.constructor.name)
    }
    return this.db
  }

  /**
   * 为查询语句附加排序和分页字句（为第一个参数statement末端拼接排序和分页字句并返回，最后一个参数page的dataCount和pageCount赋值）
   * @param statement 需要分页的语句
   * @param page 分页参数
   * @param sort 排序参数
   * @param alias 表别名
   * @protected
   */
  protected async sortAndPage(statement: string, page: Page<Query, Model>, sort?: QuerySortOption[], alias?: string): Promise<string> {
    let tempStatement = statement
    if (NotNullish(sort)) {
      tempStatement = this.sorter(tempStatement, sort, alias)
    }
    tempStatement = await this.pager(tempStatement, page)
    return tempStatement
  }
}
