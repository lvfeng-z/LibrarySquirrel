import SiteTag from '../SiteTag'
import LocalTag from '../LocalTag'

export class SiteTagDTO extends SiteTag {
  localTag: LocalTag

  constructor(siteTagDTO: SiteTagDTO) {
    super(siteTagDTO)
    if (typeof siteTagDTO.localTag == 'string') {
      this.localTag = JSON.parse(siteTagDTO.localTag)
    } else {
      this.localTag = siteTagDTO.localTag
    }
  }
}
