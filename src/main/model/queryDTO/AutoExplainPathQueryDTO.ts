import { BaseQueryDTO } from '../../base/BaseQueryDTO.js'
import { PathTypeEnum } from '../../constant/PathTypeEnum.ts'
import { NotNullish } from '../../util/CommonUtil.ts'

/**
 * 自动解释路径含义QueryDTO
 */
export default class AutoExplainPathQueryDTO extends BaseQueryDTO {
  /**
   * 名称
   */
  name: string | undefined | null

  /**
   * 类型
   */
  type: PathTypeEnum | undefined | null

  /**
   * 正则表达式
   */
  regularExpression: string | undefined | null

  /**
   * 路径
   */
  path: string | undefined | null

  constructor(autoExplainPathQueryDTO?: AutoExplainPathQueryDTO) {
    super(autoExplainPathQueryDTO)
    if (NotNullish(autoExplainPathQueryDTO)) {
      this.name = autoExplainPathQueryDTO.name
      this.type = autoExplainPathQueryDTO.type
      this.regularExpression = autoExplainPathQueryDTO.regularExpression
    }
  }

  public nonFieldProperties(): string[] {
    return [...super.nonFieldProperties(), 'path']
  }
}
