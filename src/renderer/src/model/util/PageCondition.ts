import QuerySortOption from './QuerySortOption'

export default class PageCondition<T> {
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
  query?: T
  /**
   * 排序字段
   */
  sort?: QuerySortOption[]
  /**
   * 数据
   */
  data?: T[]

  constructor(page?: PageCondition<T>) {
    if (page === undefined) {
      this.pageNumber = 1
      this.pageSize = 10
      this.pageCount = 0
      this.dataCount = 0
      this.query = undefined
      this.sort = undefined
      this.data = []
    } else {
      this.pageNumber = page.pageNumber === undefined ? 1 : page.pageNumber
      this.pageSize = page.pageSize === undefined ? 10 : page.pageSize
      this.pageCount = page.pageCount === undefined ? 0 : page.pageCount
      this.dataCount = page.dataCount === undefined ? 0 : page.dataCount
      this.query = page.query === undefined ? undefined : page.query
      this.sort = page.sort === undefined ? undefined : page.sort
      this.data = page.data === undefined ? undefined : page.data
    }
  }
}
