/**
 * QueryDTO
 * 站点标签
 */
import BaseQueryDTO from './BaseQueryDTO.ts'
import { IsNullish } from '../../util/CommonUtil.ts'

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
   * 作品id
   */
  worksId: number | null | undefined

  /**
   * 查询绑定在worksId上的还是没绑定的
   */
  boundOnWorksId: boolean | null | undefined

  constructor(localTagQueryDTO?: LocalTagQueryDTO) {
    super(localTagQueryDTO)
    if (IsNullish(localTagQueryDTO)) {
      this.localTagName = undefined
      this.baseLocalTagId = undefined
      this.worksId = undefined
      this.boundOnWorksId = undefined
    } else {
      this.localTagName = localTagQueryDTO.localTagName
      this.baseLocalTagId = localTagQueryDTO.baseLocalTagId
      this.worksId = localTagQueryDTO.worksId
      this.boundOnWorksId = localTagQueryDTO.boundOnWorksId
    }
  }
}
