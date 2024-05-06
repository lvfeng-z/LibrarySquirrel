export class PageCondition<T> {
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
  query?: Partial<T>
  /**
   * 数据
   */
  data: T[]

  constructor() {
    this.pageNumber = 1
    this.pageSize = 10
    this.pageCount = 0
    this.dataCount = 0
    this.query = undefined
    this.data = []
  }
}
