import SiteTag from '../entity/SiteTag.ts'
import LocalTag from '../entity/LocalTag.ts'
import Site from '../entity/Site.ts'
import { IsNullish } from '../../../utils/CommonUtil.ts'

export default class SiteTagDTO extends SiteTag {
  /**
   * 绑定的本地标签的实例
   */
  localTag: LocalTag | undefined | null

  /**
   * 来源站点的实例
   */
  site: Site | undefined | null

  constructor(siteTagDTO?: SiteTagDTO) {
    if (IsNullish(siteTagDTO)) {
      super()
      this.localTag = undefined
      this.site = undefined
    } else {
      super(siteTagDTO)
      if (typeof siteTagDTO.localTag == 'string') {
        this.localTag = JSON.parse(siteTagDTO.localTag)
      } else {
        this.localTag = siteTagDTO.localTag
      }
      if (typeof siteTagDTO.site == 'string') {
        this.site = JSON.parse(siteTagDTO.site)
      } else {
        this.site = siteTagDTO.site
      }
    }
  }
}
