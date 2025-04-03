import SiteAuthor from '@renderer/model/main/entity/SiteAuthor.ts'
import LocalAuthor from '@renderer/model/main/entity/LocalAuthor.ts'
import Site from '@renderer/model/main/entity/Site.ts'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

/**
 * 站点作者DTO
 */
export default class SiteAuthorFullDTO extends SiteAuthor {
  /**
   * 本地作者
   */
  localAuthor: LocalAuthor | undefined | null

  /**
   * 来源站点的实例
   */
  site: Site | undefined | null

  constructor(siteAuthorDTO?: SiteAuthorFullDTO) {
    super(siteAuthorDTO)
    if (NotNullish(siteAuthorDTO)) {
      this.localAuthor = siteAuthorDTO.localAuthor
      this.site = siteAuthorDTO.site
    }
  }
}
