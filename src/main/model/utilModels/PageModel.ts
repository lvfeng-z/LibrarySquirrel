import BaseQueryDTO from '../queryDTO/BaseQueryDTO.ts'

export default class PageModel<Query extends BaseQueryDTO, Result> {
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

  constructor(page?: PageModel<Query, Result>) {
    if (page === undefined) {
      this.paging = true
      this.pageNumber = 1
      this.pageSize = 10
      this.pageCount = 0
      this.dataCount = 0
      this.query = new BaseQueryDTO() as Query
      this.data = []
    } else {
      this.paging = page.paging === undefined ? true : page.paging
      this.pageNumber = page.pageNumber === undefined ? 1 : page.pageNumber
      this.pageSize = page.pageSize === undefined ? 10 : page.pageSize
      this.pageCount = page.pageCount === undefined ? 0 : page.pageCount
      this.dataCount = page.dataCount === undefined ? 0 : page.dataCount
      this.query = page.query === undefined ? (new BaseQueryDTO() as Query) : page.query
      this.data = page.data === undefined ? [] : page.data
    }
  }

  /**
   * 返回一个指定类型的PageModel
   */
  public transform<T>(): PageModel<Query, T> {
    const result = new PageModel<Query, T>()
    result.paging = this.paging
    result.pageNumber = this.pageNumber
    result.pageSize = this.pageSize
    result.pageCount = this.pageCount
    result.dataCount = this.dataCount
    result.query = this.query
    result.data = []

    return result
  }
}
