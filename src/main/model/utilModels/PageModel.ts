import { QuerySortOption } from './QuerySortOption'

export class PageModel<Query, Result> {
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
  query?: Partial<Query>
  /**
   * 排序字段(第一个元素为排序字段名称，第二个字段为排序方式)
   */
  sort?: QuerySortOption[]
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
      this.query = undefined
      this.sort = undefined
      this.data = []
    } else {
      this.paging = page.paging === undefined ? true : page.paging
      this.pageNumber = page.pageNumber === undefined ? 1 : page.pageNumber
      this.pageSize = page.pageSize === undefined ? 10 : page.pageSize
      this.pageCount = page.pageCount === undefined ? 0 : page.pageCount
      this.dataCount = page.dataCount === undefined ? 0 : page.dataCount
      this.query = page.query === undefined ? undefined : page.query
      this.sort = page.sort === undefined ? undefined : page.sort
      this.data = page.data === undefined ? [] : page.data
    }
  }
}
