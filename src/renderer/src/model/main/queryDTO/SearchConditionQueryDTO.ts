import BaseQueryDTO from './BaseQueryDTO.js'
import { SearchType } from '@renderer/model/util/SearchCondition.ts'

export default class SearchConditionQueryDTO extends BaseQueryDTO {
  /**
   * 类型
   */
  types?: SearchType[]

  constructor(types?: SearchType[]) {
    super()
    this.types = types
  }
}
