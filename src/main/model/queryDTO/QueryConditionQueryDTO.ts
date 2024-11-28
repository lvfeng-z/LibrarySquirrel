import { QueryType } from '../util/QueryCondition.js'
import BaseQueryDTO from './BaseQueryDTO.js'

export default class QueryConditionQueryDTO extends BaseQueryDTO {
  /**
   * 类型
   */
  types?: QueryType[]

  constructor(types?: QueryType[]) {
    super()
    this.types = types
  }
}
