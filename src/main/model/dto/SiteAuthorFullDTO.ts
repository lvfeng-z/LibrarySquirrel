import SiteAuthor from '../entity/SiteAuthor.js'
import LocalAuthor from '../entity/LocalAuthor.js'
import Site from '../entity/Site.js'
import { NotNullish } from '../../util/CommonUtil.js'
import lodash from 'lodash'

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
    }
  }
}
