import BaseModel from './BaseModel.ts'
import { isNullish } from '../../util/CommonUtil.ts'

/**
 * 本地作者
 */
export default class LocalAuthor extends BaseModel {
  /**
   * 作者名称
   */
  localAuthorName: string | undefined | null

  constructor(localAuthor?: LocalAuthor) {
    if (isNullish(localAuthor)) {
      super()
      this.localAuthorName = undefined
    } else {
      super(localAuthor)
      this.localAuthorName = localAuthor.localAuthorName
    }
  }
}
