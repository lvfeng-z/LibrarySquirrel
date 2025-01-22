import SiteTag from '../entity/SiteTag.ts'
import LocalTag from '../entity/LocalTag.ts'
import Site from '../entity/Site.ts'
import { NotNullish } from '../../util/CommonUtil.ts'
import { ParsePropertyFromJson } from '../../util/ObjectUtil.js'
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
    if (NotNullish(siteTag)) {
      lodash.assign(this, lodash.assign(siteTag, ['localTag', 'site']))
      const properties = [
        {
          property: 'localTag',
          constructor: LocalTag
        },
        {
          property: 'site',
          constructor: Site
        }
      ]
      ParsePropertyFromJson(this, properties)
    }
  }
}
