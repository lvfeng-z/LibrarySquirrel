import BaseEntity from '../../base/BaseEntity.ts'
import { NotNullish } from '../../util/CommonUtil.ts'
import BaseAuthor from '../interface/BaseAuthor.js'

/**
 * 本地作者
 */
export default class LocalAuthor extends BaseEntity implements BaseAuthor {
  /**
   * 作者名称
   */
  authorName: string | undefined | null
  /**
   * 介绍
   */
  introduce: string | undefined | null
  /**
   * 最后一次使用的时间
   */
  lastUse: number | null | undefined

  constructor(localAuthor?: LocalAuthor) {
    super(localAuthor)
    if (NotNullish(localAuthor)) {
      this.authorName = localAuthor.authorName
      this.introduce = localAuthor.introduce
      this.lastUse = localAuthor.lastUse
    }
  }
}
