import SiteTag from '../entity/SiteTag.ts'
import LocalTag from '../entity/LocalTag.ts'
import Site from '../entity/Site.ts'
import lodash from 'lodash'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'
import { ParsePropertyFromJson } from '@renderer/utils/ObjectUtil.ts'

export default class SiteTagFullDTO extends SiteTag {
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
        { property: 'localTag', builder: (src) => new LocalTag(src) },
        { property: 'site', builder: (src) => new Site(src) }
      ]
      ParsePropertyFromJson(this, properties)
    }
  }
}
