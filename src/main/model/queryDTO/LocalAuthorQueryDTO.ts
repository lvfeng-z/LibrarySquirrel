/**
 * 本地作者
 */
import BaseQueryDTO from './BaseQueryDTO.ts'

export default class LocalAuthorQueryDTO extends BaseQueryDTO {
  /**
   * 作者名称
   */
  localAuthorName: string | undefined | null

  constructor(localAuthorQueryDTO?: LocalAuthorQueryDTO) {
    if (localAuthorQueryDTO === undefined || localAuthorQueryDTO === null) {
      super()
      this.localAuthorName = undefined
    } else {
      super(localAuthorQueryDTO)
      this.id = localAuthorQueryDTO.id
      this.localAuthorName = localAuthorQueryDTO.localAuthorName
    }
  }
}
