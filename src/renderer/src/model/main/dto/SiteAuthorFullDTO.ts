import SiteAuthor from '@renderer/model/main/entity/SiteAuthor.ts'
import LocalAuthor from '@renderer/model/main/entity/LocalAuthor.ts'
import Site from '@renderer/model/main/entity/Site.ts'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'
import lodash from 'lodash'
import { ParsePropertyFromJson } from '@renderer/utils/ObjectUtil.ts'

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

  constructor(siteAuthorDTO?: SiteAuthor) {
    super(siteAuthorDTO)
    if (NotNullish(siteAuthorDTO)) {
      lodash.assign(this, lodash.pick(siteAuthorDTO, ['localAuthor', 'site']))
      ParsePropertyFromJson(this, [
        { property: 'localAuthor', builder: (src) => new LocalAuthor(src) },
        { property: 'site', builder: (src) => new Site(src) }
      ])
    }
  }
}
