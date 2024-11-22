import { Id } from '../entity/BaseModel.ts'
import { COMPARATOR } from '../../constant/CrudConstant.ts'
import QuerySortOption from '../../constant/QuerySortOption.ts'
import { toObjAcceptedBySqlite3 } from '../../util/DatabaseUtil.ts'

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
   * 指定运算符
   */
  assignComparator?: { [key: string]: COMPARATOR } | undefined

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
      this.assignComparator = undefined
      this.sort = undefined
    } else {
      this.id = baseQueryDTO.id
      this.createTime = baseQueryDTO.createTime
      this.updateTime = baseQueryDTO.updateTime
      this.keyword = baseQueryDTO.keyword
      this.assignComparator = baseQueryDTO.assignComparator
      this.sort = baseQueryDTO.sort
    }
  }

  /**
   * 获取可用于查询的实例
   */
  public getQueryObject() {
    return toObjAcceptedBySqlite3(this, ['assignComparator', 'sort'])
  }

  /**
   * 获取keyword的全匹配字符串
   */
  public keywordForFullMatch() {
    return '%' + this.keyword + '%'
  }
}
