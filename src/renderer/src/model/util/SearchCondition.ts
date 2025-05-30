import { CrudOperator } from '@renderer/constants/CrudOperator.ts'
import { IsNullish } from '@renderer/utils/CommonUtil.ts'

export class SearchCondition {
  /**
   * 查询参数值
   */
  value: unknown | null

  /**
   * 查询参数类型
   */
  type: SearchType

  /**
   * 操作符
   */
  operator?: CrudOperator

  constructor(searchCondition: SearchCondition) {
    this.value = searchCondition.value
    this.type = searchCondition.type
    this.operator = IsNullish(searchCondition.operator) ? CrudOperator.EQUAL : searchCondition.operator
  }
}

export enum SearchType {
  LOCAL_TAG = 1,
  SITE_TAG = 2,
  LOCAL_AUTHOR = 3,
  SITE_AUTHOR = 4,
  WORKS_SITE_NAME = 5,
  WORKS_NICKNAME = 6,
  WORKS_UPLOAD_TIME = 7,
  WORKS_LAST_VIEW = 8,
  MEDIA_TYPE = 9,
  SITE = 10
}
