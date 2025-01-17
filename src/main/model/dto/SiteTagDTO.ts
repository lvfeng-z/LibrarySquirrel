import SiteTag from '../entity/SiteTag.ts'
import LocalTag from '../entity/LocalTag.ts'
import Site from '../entity/Site.ts'
import { isNullish } from '../../util/CommonUtil.ts'
import lodash from 'lodash'

export default class SiteTagDTO extends SiteTag {
  /**
   * 绑定的本地标签的实例
   */
  localTag: LocalTag | undefined | null

  /**
   * 来源站点的实例
   */
  site: Site | undefined | null

  constructor(siteTag?: SiteTag) {
    super(siteTag)
    if (isNullish(siteTag)) {
      this.localTag = undefined
      this.site = undefined
    } else {
      if (typeof siteTag['localTag'] == 'string') {
        this.localTag = JSON.parse(siteTag['localTag'])
      } else {
        this.localTag = siteTag['localTag']
      }
      if (typeof siteTag['site'] == 'string') {
        this.site = JSON.parse(siteTag['site'])
      } else {
        this.site = siteTag['site']
      }
      lodash.assign(this, lodash.pick(siteTag, ['localTag', 'site']))
    }
  }
}
