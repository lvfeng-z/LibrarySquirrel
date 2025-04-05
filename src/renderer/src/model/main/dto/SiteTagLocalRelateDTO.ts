import SiteTag from '../entity/SiteTag.ts'
import lodash from 'lodash'
import SiteTagFullDTO from './SiteTagFullDTO.js'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

export default class SiteTagLocalRelateDTO extends SiteTagFullDTO {
  /**
   * 绑定的本地标签的实例
   */
  hasSameNameLocalTag: boolean | undefined | null

  constructor(siteTag?: SiteTag) {
    super(siteTag)
    if (NotNullish(siteTag)) {
      lodash.assign(this, lodash.pick(siteTag, ['hasSameNameLocalTag']))
      this.hasSameNameLocalTag = Boolean(this.hasSameNameLocalTag)
    }
  }
}
