import BaseModel from '../BaseModel.ts'
import { COMPARATOR } from '../../constant/CrudConstant.ts'
import QuerySortOption from '../../constant/QuerySortOption.ts'
import DatabaseUtil from '../../util/DatabaseUtil.ts'

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

  /**
   * 获取可用于查询的实例
   */
  public getQueryObject() {
    const query = DatabaseUtil.toObjAcceptedBySqlite3(this)
    delete query.assignComparator
    delete query.sort
    return query
  }

  /**
   * 获取keyword的全匹配字符串
   */
  public keywordForFullMatch() {
    return '%' + this.keyword + '%'
  }
}
