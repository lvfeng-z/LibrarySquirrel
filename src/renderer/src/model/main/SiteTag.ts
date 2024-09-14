import BaseModel from './BaseModel.ts'
import { isNullish } from '../../utils/CommonUtil.ts'

/**
 * 站点标签
 */
export default class SiteTag extends BaseModel {
  /**
   * 主键
   */
  id: number | undefined | null
  /**
   * 标签来源站点id
   */
  siteId: number | undefined | null
  /**
   * 站点中标签的id
   */
  siteTagId: string | undefined | null
  /**
   * 站点中标签的名称
   */
  siteTagName: string | undefined | null
  /**
   * 上级标签id
   */
  baseSiteTagId: string | undefined | null
  /**
   * 描述
   */
  description: string | undefined | null
  /**
   * 站点标签对应的本地标签id
   */
  localTagId: number | undefined | null

  constructor(siteTag?: SiteTag) {
    if (isNullish(siteTag)) {
      super()
      this.id = undefined
      this.siteId = undefined
      this.siteTagId = undefined
      this.siteTagName = undefined
      this.baseSiteTagId = undefined
      this.description = undefined
      this.localTagId = undefined
    } else {
      super(siteTag)
      this.id = siteTag.id
      this.siteId = siteTag.siteId
      this.siteTagId = siteTag.siteTagId
      this.siteTagName = siteTag.siteTagName
      this.baseSiteTagId = siteTag.baseSiteTagId
      this.description = siteTag.description
      this.localTagId = siteTag.localTagId
    }
  }
}
