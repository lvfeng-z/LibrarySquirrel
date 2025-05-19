import { NotNullish } from '../../../utils/CommonUtil.ts'
import BaseEntity from './BaseEntity.ts'
import BaseAuthor from '@renderer/model/main/interface/BaseAuthor.ts'

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
