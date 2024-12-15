import { Id } from '../entity/BaseEntity.ts'
import { Operator } from '../../constant/CrudConstant.ts'
import QuerySortOption from '../../constant/QuerySortOption.ts'
import { toObjAcceptedBySqlite3 } from '../../util/DatabaseUtil.ts'
import { notNullish } from '../../util/CommonUtil.js'
import StringUtil from '../../util/StringUtil.js'

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
  operators?: { [key: string]: Operator } | undefined

  /**
   * 排序配置
   */
  sort?: QuerySortOption | undefined

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

  /**
   * 获取仅包含查询参数的对象
   */
  public toPlainParams(ignore?: string[]) {
    const fullIgnore = ['operators', 'sort', 'keyword']
    if (notNullish(ignore)) {
      fullIgnore.push(...ignore)
    }
    return toObjAcceptedBySqlite3(this, fullIgnore)
  }

  /**
   * 获取keyword的全匹配字符串
   */
  public keywordForFullMatch(): string | undefined {
    return StringUtil.isBlank(this.keyword) ? undefined : '%' + this.keyword + '%'
  }
}
