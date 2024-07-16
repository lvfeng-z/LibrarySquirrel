import BaseQueryDTO from './BaseQueryDTO.ts'
import { PathType } from '../../constant/PathType.ts'
import { isNullish } from '../../util/CommonUtil.ts'

/**
 * 自动解释路径含义QueryDTO
 */
export default class AutoExplainPathQueryDTO extends BaseQueryDTO {
  /**
   * 主键
   */
  id: number | undefined | null

  /**
   * 名称
   */
  name: string | undefined | null

  /**
   * 类型
   */
  type: PathType | undefined | null

  /**
   * 正则表达式
   */
  regularExpression: string | undefined | null

  constructor(autoExplainPathQueryDTO?: AutoExplainPathQueryDTO) {
    if (isNullish(autoExplainPathQueryDTO)) {
      super()
      this.id = undefined
      this.name = undefined
      this.type = undefined
      this.regularExpression = undefined
    } else {
      super(autoExplainPathQueryDTO)
      this.id = autoExplainPathQueryDTO.id
      this.name = autoExplainPathQueryDTO.name
      this.type = autoExplainPathQueryDTO.type
      this.regularExpression = autoExplainPathQueryDTO.regularExpression
    }
  }
}
