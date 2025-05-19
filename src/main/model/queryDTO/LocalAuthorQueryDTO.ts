import { BaseQueryDTO } from '../../base/BaseQueryDTO.js'
import { NotNullish } from '../../util/CommonUtil.ts'

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
