export class PageModel<T> {
  pageNumber: number
  pageSize: number
  query?: Partial<T>
  data: T[]

  constructor() {
    this.pageNumber = 1
    this.pageSize = 10
    this.query = undefined
    this.data = []
  }
}
