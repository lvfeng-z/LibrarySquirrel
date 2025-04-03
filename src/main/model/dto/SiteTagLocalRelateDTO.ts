import SiteTag from '../entity/SiteTag.ts'
import { NotNullish } from '../../util/CommonUtil.ts'
import lodash from 'lodash'
import SiteTagFullDTO from './SiteTagFullDTO.js'

export default class SiteTagLocalRelateDTO extends SiteTagFullDTO {
  /**
   * 绑定的本地标签的实例
   */
  hasSameNameLocalTag: boolean | undefined | null

  constructor(siteTag?: SiteTag) {
    super(siteTag)
    if (NotNullish(siteTag)) {
      lodash.assign(this, lodash.assign(siteTag, ['hasSameNameLocalTag']))
    }
  }
}
