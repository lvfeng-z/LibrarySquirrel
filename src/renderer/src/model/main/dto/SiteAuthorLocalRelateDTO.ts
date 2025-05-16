import lodash from 'lodash'
import SiteAuthorFullDTO from './SiteAuthorFullDTO.js'
import SiteAuthor from '../entity/SiteAuthor.js'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

/**
 * 站点标签与本地作者联系DTO
 */
export default class SiteAuthorLocalRelateDTO extends SiteAuthorFullDTO {
  /**
   * 是否有同名本地作者
   */
  hasSameNameLocalAuthor: boolean | undefined | null

  constructor(siteAuthor?: SiteAuthor) {
    super(siteAuthor)
    if (NotNullish(siteAuthor)) {
      lodash.assign(this, lodash.pick(siteAuthor, ['hasSameNameLocalAuthor']))
      this.hasSameNameLocalAuthor = Boolean(this.hasSameNameLocalAuthor)
    }
  }
}
