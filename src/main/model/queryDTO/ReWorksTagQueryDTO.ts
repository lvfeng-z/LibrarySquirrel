import BaseQueryDTO from '../../base/BaseQueryDTO.ts'

/**
 * 作品与标签关联查询DTO
 */
export class ReWorksTagQueryDTO extends BaseQueryDTO {
  /**
   * 作品id
   */
  worksId: number | undefined | null
  /**
   * 标签类型（0：本地，1：站点）
   */
  tagType: number | undefined | null
  /**
   * 本地标签id
   */
  localTagId: number | undefined | null
  /**
   * 站点标签id
   */
  siteTagId: number | undefined | null

  constructor(reWorksTagQueryDTO?: ReWorksTagQueryDTO) {
    if (reWorksTagQueryDTO === undefined) {
      super()
      this.worksId = undefined
      this.tagType = undefined
      this.localTagId = undefined
      this.siteTagId = undefined
    } else {
      super(reWorksTagQueryDTO)
      this.worksId = reWorksTagQueryDTO.worksId
      this.tagType = reWorksTagQueryDTO.tagType
      this.localTagId = reWorksTagQueryDTO.localTagId
      this.siteTagId = reWorksTagQueryDTO.siteTagId
    }
  }
}
