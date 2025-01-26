import BaseEntity from '../../base/BaseEntity.ts'
import { IsNullish } from '../../util/CommonUtil.ts'

/**
 * 本地作者
 */
export default class LocalAuthor extends BaseEntity {
  /**
   * 作者名称
   */
  localAuthorName: string | undefined | null
  /**
   * 最后一次使用的时间
   */
  lastUse: number | null | undefined

  constructor(localAuthor?: LocalAuthor) {
    super(localAuthor)
    if (IsNullish(localAuthor)) {
      this.localAuthorName = undefined
      this.lastUse = undefined
    } else {
      this.localAuthorName = localAuthor.localAuthorName
      this.lastUse = localAuthor.lastUse
    }
  }
}
