/**
 * 本地作者
 */
import BaseModel from './BaseModel.ts'

export default class LocalAuthor extends BaseModel {
  /**
   * 作者名称
   */
  localAuthorName: string | undefined | null

  constructor(localAuthor?: LocalAuthor) {
    if (localAuthor === undefined || localAuthor === null) {
      super()
      this.localAuthorName = undefined
    } else {
      super(localAuthor)
      this.localAuthorName = localAuthor.localAuthorName
    }
  }
}
