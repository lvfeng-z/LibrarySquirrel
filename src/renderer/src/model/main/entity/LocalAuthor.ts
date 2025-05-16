import { NotNullish } from '../../../utils/CommonUtil.ts'
import BaseEntity from './BaseEntity.ts'

/**
 * 本地作者
 */
export default class LocalAuthor extends BaseEntity {
  /**
   * 作者名称
   */
  localAuthorName: string | undefined | null
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
      this.localAuthorName = localAuthor.localAuthorName
      this.introduce = localAuthor.introduce
      this.lastUse = localAuthor.lastUse
    }
  }
}
