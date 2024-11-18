import BaseQueryDTO from '@renderer/model/main/queryDTO/BaseQueryDTO.ts'
import { isNullish } from '@renderer/utils/CommonUtil.ts'

/**
 * 本地作者
 */
export default class LocalAuthorQueryDTO extends BaseQueryDTO {
  /**
   * 作者名称
   */
  localAuthorName: string | undefined | null

  constructor(localAuthorQueryDTO?: LocalAuthorQueryDTO) {
    if (isNullish(localAuthorQueryDTO)) {
      super()
      this.localAuthorName = undefined
    } else {
      super(localAuthorQueryDTO)
      this.localAuthorName = localAuthorQueryDTO.localAuthorName
    }
  }
}
