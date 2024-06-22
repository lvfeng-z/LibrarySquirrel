import BaseModel from '../BaseModel.ts'
import QuerySortOption from '../../util/QuerySortOption.ts'

export default class BaseQueryDTO extends BaseModel {
  keyword: string | undefined | null
  /**
   * 排序字段(第一个元素为排序字段名称，第二个字段为排序方式)
   */
  sort?: QuerySortOption[]

  constructor(baseQueryDTO?: BaseQueryDTO) {
    super(baseQueryDTO)
    if (baseQueryDTO === undefined) {
      this.keyword = undefined
    } else {
      this.keyword = baseQueryDTO.keyword
    }
  }
}
