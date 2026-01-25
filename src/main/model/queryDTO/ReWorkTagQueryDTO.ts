import BaseQueryDTO from '../../base/BaseQueryDTO.js'
import { NotNullish } from '../../util/CommonUtil.js'

/**
 * 作品与标签关联查询DTO
 */
export class ReWorkTagQueryDTO extends BaseQueryDTO {
  /**
   * 作品id
   */
  workId: number | undefined | null
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

  constructor(reWorkTagQueryDTO?: ReWorkTagQueryDTO) {
    super(reWorkTagQueryDTO)
    if (NotNullish(reWorkTagQueryDTO)) {
      this.workId = reWorkTagQueryDTO.workId
      this.tagType = reWorkTagQueryDTO.tagType
      this.localTagId = reWorkTagQueryDTO.localTagId
      this.siteTagId = reWorkTagQueryDTO.siteTagId
    }
  }
}
