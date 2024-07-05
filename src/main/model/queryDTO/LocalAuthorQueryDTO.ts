import BaseQueryDTO from './BaseQueryDTO.ts'
import { isNullish } from '../../util/CommonUtil.ts'

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
