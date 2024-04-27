import SiteTag from '../SiteTag'
import LocalTag from '../LocalTag'

export class SiteTagDTO extends SiteTag {
  localTag: LocalTag

  constructor(siteTagDTO: SiteTagDTO) {
    super(siteTagDTO)
    this.localTag = siteTagDTO.localTag
  }
}
