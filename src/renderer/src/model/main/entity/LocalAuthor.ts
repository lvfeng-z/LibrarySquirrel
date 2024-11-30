import { isNullish } from '../../../utils/CommonUtil.ts'
import BaseEntity from './BaseEntity.ts'

/**
 * 本地作者
 */
export default class LocalAuthor extends BaseEntity {
  /**
   * 主键
   */
  id: number | undefined | null

  /**
   * 作者名称
   */
  localAuthorName: string | undefined | null

  constructor(localAuthor?: LocalAuthor) {
    if (isNullish(localAuthor)) {
      super()
      this.id = undefined
      this.localAuthorName = undefined
    } else {
      super(localAuthor)
      this.id = localAuthor.id
      this.localAuthorName = localAuthor.localAuthorName
    }
  }
}
