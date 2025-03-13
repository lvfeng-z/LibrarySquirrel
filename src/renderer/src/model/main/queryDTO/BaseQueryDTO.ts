import { Id } from '@renderer/model/main/entity/BaseEntity.ts'
import { CrudOperator } from '@renderer/constants/CrudOperator.ts'
import { QuerySortOption } from '@renderer/model/util/QuerySortOption.ts'

export default class BaseQueryDTO {
  /**
   * 主键
   */
  id?: Id

  /**
   * 创建时间
   */
  createTime?: number | null | undefined

  /**
   * 更新时间
   */
  updateTime?: number | null | undefined

  /**
   * 关键字
   */
  keyword?: string | undefined | null

  /**
   * 指定比较符
   */
  operators?: { [key: string]: CrudOperator } | undefined

  /**
   * 排序字段(第一个元素为排序字段名称，第二个字段为排序方式)
   */
  sort?: QuerySortOption[]

  constructor(baseQueryDTO?: BaseQueryDTO) {
    if (baseQueryDTO === undefined) {
      this.id = undefined
      this.createTime = undefined
      this.updateTime = undefined
      this.keyword = undefined
      this.operators = undefined
      this.sort = undefined
    } else {
      this.id = baseQueryDTO.id
      this.createTime = baseQueryDTO.createTime
      this.updateTime = baseQueryDTO.updateTime
      this.keyword = baseQueryDTO.keyword
      this.operators = baseQueryDTO.operators
      this.sort = baseQueryDTO.sort
    }
  }
}
