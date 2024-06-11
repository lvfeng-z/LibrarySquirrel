import BaseModel from '../BaseModel.ts'
import { COMPARATOR } from '../../constant/CrudConstant.ts'

export default class BaseQueryDTO extends BaseModel {
  /**
   * 关键字
   */
  keyword: string | undefined | null

  /**
   * 指定运算符
   */
  assignComparator: { [key: string]: COMPARATOR } | undefined

  constructor(baseQueryDTO?: BaseQueryDTO) {
    super(baseQueryDTO)
    if (baseQueryDTO === undefined) {
      this.keyword = undefined
      this.assignComparator = undefined
    } else {
      this.keyword = baseQueryDTO.keyword
      this.assignComparator = baseQueryDTO.assignComparator
    }
  }

  public getKeywordLikeString() {
    return '%' + this.keyword + '%'
  }
}
