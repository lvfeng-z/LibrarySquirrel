import BaseQueryDTO from '../../base/BaseQueryDTO.js'
import { NotNullish } from '../../util/CommonUtil.ts'

/**
 * QueryDTO
 * 站点标签
 */
export default class LocalTagQueryDTO extends BaseQueryDTO {
  /**
   * 本地标签名称
   */
  localTagName: string | null | undefined

  /**
   * 上级标签id
   */
  baseLocalTagId: number | null | undefined

  /**
   * 最后一次使用的时间
   */
  lastUse: number | null | undefined

  /**
   * 作品id
   */
  worksId: number | null | undefined

  /**
   * 查询绑定在worksId上的还是没绑定的
   */
  boundOnWorksId: boolean | null | undefined

  constructor(localTagQueryDTO?: LocalTagQueryDTO) {
    super(localTagQueryDTO)
    if (NotNullish(localTagQueryDTO)) {
      this.localTagName = localTagQueryDTO.localTagName
      this.baseLocalTagId = localTagQueryDTO.baseLocalTagId
      this.lastUse = localTagQueryDTO.lastUse
      this.worksId = localTagQueryDTO.worksId
      this.boundOnWorksId = localTagQueryDTO.boundOnWorksId
    }
  }

  public static nonFieldProperties(): string[] {
    return [...BaseQueryDTO.nonFieldProperties(), 'worksId', 'boundOnWorksId']
  }
}
