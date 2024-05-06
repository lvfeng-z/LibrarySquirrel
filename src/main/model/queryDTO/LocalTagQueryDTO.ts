/**
 * QueryDTO
 * 站点标签
 */
import { BaseQueryDTO } from './BaseQueryDTO'

export default class LocalTagQueryDTO extends BaseQueryDTO {
  /**
   * 本地标签名称
   */
  localTagName: string | null | undefined
  /**
   * 上级标签id
   */
  baseLocalTagId: number | null | undefined
  constructor(localTagQueryDTO: LocalTagQueryDTO) {
    super(localTagQueryDTO)
    this.id = localTagQueryDTO.id
    this.localTagName = localTagQueryDTO.localTagName
    this.baseLocalTagId = localTagQueryDTO.baseLocalTagId
  }
}
