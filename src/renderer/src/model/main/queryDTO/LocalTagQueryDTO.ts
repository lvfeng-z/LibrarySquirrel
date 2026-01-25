import BaseQueryDTO from './BaseQueryDTO.ts'
import { IsNullish } from '@renderer/utils/CommonUtil.ts'

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
   * 作品id
   */
  workId: number | null | undefined

  /**
   * 查询绑定在workId上的还是没绑定的
   */
  boundOnWorkId: boolean | null | undefined

  constructor(localTagQueryDTO?: LocalTagQueryDTO) {
    super(localTagQueryDTO)
    if (IsNullish(localTagQueryDTO)) {
      this.localTagName = undefined
      this.baseLocalTagId = undefined
      this.workId = undefined
      this.boundOnWorkId = undefined
    } else {
      this.localTagName = localTagQueryDTO.localTagName
      this.baseLocalTagId = localTagQueryDTO.baseLocalTagId
      this.workId = localTagQueryDTO.workId
      this.boundOnWorkId = localTagQueryDTO.boundOnWorkId
    }
  }
}
