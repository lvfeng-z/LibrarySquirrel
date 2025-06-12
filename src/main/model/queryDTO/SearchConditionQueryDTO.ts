import { SearchType } from '../util/SearchCondition.js'
import BaseQueryDTO from '../../base/BaseQueryDTO.js'

export default class SearchConditionQueryDTO extends BaseQueryDTO {
  /**
   * 类型
   */
  types?: SearchType[]

  keyword?: string

  constructor(types?: SearchType[]) {
    super()
    this.types = types
  }
}
