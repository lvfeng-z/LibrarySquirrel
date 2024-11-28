import BaseQueryDTO from '../queryDTO/BaseQueryDTO.ts'
import { isNullish } from '../../util/CommonUtil.js'

export default class Page<Query, Result> {
  /**
   * 是否分页
   */
  paging: boolean
  /**
   * 当前页码
   */
  pageNumber: number
  /**
   * 分页大小
   */
  pageSize: number
  /**
   * 总页数
   */
  pageCount: number
  /**
   * 数据总量
   */
  dataCount: number
  /**
   * 查询条件
   */
  query?: Query
  /**
   * 数据
   */
  data?: Result[]

  constructor(page?: Page<Query, Result>) {
    if (page === undefined) {
      this.paging = true
      this.pageNumber = 1
      this.pageSize = 10
      this.pageCount = 0
      this.dataCount = 0
      this.query = new BaseQueryDTO() as Query
      this.data = []
    } else {
      this.paging = isNullish(page.paging) ? true : page.paging
      this.pageNumber = isNullish(page.pageNumber) ? 1 : page.pageNumber
      this.pageSize = isNullish(page.pageSize) ? 10 : page.pageSize
      this.pageCount = isNullish(page.pageCount) ? 0 : page.pageCount
      this.dataCount = isNullish(page.dataCount) ? 0 : page.dataCount
      this.query = isNullish(page.query) ? (new BaseQueryDTO() as Query) : page.query
      this.data = isNullish(page.data) ? [] : page.data
    }
  }

  /**
   * 返回一个指定类型的PageModel
   */
  public transform<T>(): Page<Query, T> {
    const result = new Page<Query, T>()
    result.paging = this.paging
    result.pageNumber = this.pageNumber
    result.pageSize = this.pageSize
    result.pageCount = this.pageCount
    result.dataCount = this.dataCount
    result.query = this.query
    result.data = []

    return result
  }

  public copy<NewQuery, NewResult>(): Page<NewQuery, NewResult> {
    const result = new Page<NewQuery, NewResult>()
    result.paging = this.paging
    result.pageNumber = this.pageNumber
    result.pageSize = this.pageSize
    result.pageCount = this.pageCount
    result.dataCount = this.dataCount
    result.query = undefined
    result.data = undefined

    return result
  }
}
