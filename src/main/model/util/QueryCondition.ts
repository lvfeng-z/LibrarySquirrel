import { Operator } from '../../constant/CrudConstant.js'
import { isNullish } from '../../util/CommonUtil.js'

export class QueryCondition {
  /**
   * 查询参数值
   */
  value: unknown | null

  /**
   * 查询参数类型
   */
  type: QueryType

  /**
   * 操作符
   */
  operator?: Operator

  constructor(queryCondition: QueryCondition) {
    this.value = queryCondition.value
    this.type = queryCondition.type
    this.operator = isNullish(queryCondition.operator) ? Operator.EQUAL : queryCondition.operator
  }
}

export enum QueryType {
  LOCAL_TAG = 1,
  SITE_TAG = 2,
  LOCAL_AUTHOR = 3,
  SITE_AUTHOR = 4,
  WORKS_SITE_NAME = 5,
  WORKS_NICKNAME = 6,
  WORKS_UPLOAD_TIME = 7,
  WORKS_LAST_VIEW = 8,
  MEDIA_TYPE = 9
}
