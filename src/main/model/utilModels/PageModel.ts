export class PageModel<Query, Result> {
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
  sort?: [string, 'asc' | 'desc'][]
  /**
   * 数据
   */
  data?: Result[]

  constructor(page?: PageModel<Query, Result>) {
    this.pageNumber = page ? page.pageNumber : 1
    this.pageSize = page ? page.pageSize : 10
    this.pageCount = page ? page.pageCount : 0
    this.dataCount = page ? page.dataCount : 0
    this.query = page ? page.query : undefined
    this.sort = undefined
    this.data = page ? page.data : []
  }
}
