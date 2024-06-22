import BaseModel from '../BaseModel.ts'
import { COMPARATOR } from '../../constant/CrudConstant.ts'
import QuerySortOption from '../utilModels/QuerySortOption.ts'

export default class BaseQueryDTO extends BaseModel {
  /**
   * 关键字
   */
  keyword: string | undefined | null

  /**
   * 指定运算符
   */
  assignComparator: { [key: string]: COMPARATOR } | undefined

  /**
   * 排序字段(第一个元素为排序字段名称，第二个字段为排序方式)
   */
  sort?: QuerySortOption[]

  constructor(baseQueryDTO?: BaseQueryDTO) {
    super(baseQueryDTO)
    if (baseQueryDTO === undefined) {
      this.keyword = undefined
      this.assignComparator = undefined
      this.sort = undefined
    } else {
      this.keyword = baseQueryDTO.keyword
      this.assignComparator = baseQueryDTO.assignComparator
      this.sort = baseQueryDTO.sort
    }
  }

  public getKeywordLikeString() {
    return '%' + this.keyword + '%'
  }
}
