import SiteTag from '../SiteTag'
import LocalTag from '../LocalTag'
import Site from '../Site'

export class SiteTagDTO extends SiteTag {
  /**
   * 绑定的本地标签的实例
   */
  localTag: LocalTag

  /**
   * 来源站点的实例
   */
  site: Site

  constructor(siteTagDTO: SiteTagDTO) {
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
