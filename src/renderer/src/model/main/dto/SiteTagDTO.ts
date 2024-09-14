import SiteTag from '../SiteTag.ts'
import LocalTag from '../LocalTag.ts'
import Site from '../Site.ts'
import { isNullish } from '../../../utils/CommonUtil.ts'

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
    if (isNullish(siteTagDTO)) {
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
