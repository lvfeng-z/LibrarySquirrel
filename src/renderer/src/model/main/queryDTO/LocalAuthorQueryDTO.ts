import BaseQueryDTO from '@renderer/model/main/queryDTO/BaseQueryDTO.ts'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

/**
 * 本地作者
 */
export default class LocalAuthorQueryDTO extends BaseQueryDTO {
  /**
   * 作者名称
   */
  authorName: string | undefined | null
  /**
   * 最后一次使用的时间
   */
  lastUse: number | null | undefined

  constructor(localAuthorQueryDTO?: LocalAuthorQueryDTO) {
    super(localAuthorQueryDTO)
    if (NotNullish(localAuthorQueryDTO)) {
      this.authorName = localAuthorQueryDTO.authorName
      this.lastUse = localAuthorQueryDTO.lastUse
    }
  }
}
