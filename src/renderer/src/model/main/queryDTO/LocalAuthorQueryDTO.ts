import BaseQueryDTO from '@renderer/model/main/queryDTO/BaseQueryDTO.ts'
import { IsNullish } from '@renderer/utils/CommonUtil.ts'

/**
 * 本地作者
 */
export default class LocalAuthorQueryDTO extends BaseQueryDTO {
  /**
   * 作者名称
   */
  localAuthorName: string | undefined | null

  constructor(localAuthorQueryDTO?: LocalAuthorQueryDTO) {
    if (IsNullish(localAuthorQueryDTO)) {
      super()
      this.localAuthorName = undefined
    } else {
      super(localAuthorQueryDTO)
      this.localAuthorName = localAuthorQueryDTO.localAuthorName
    }
  }
}
