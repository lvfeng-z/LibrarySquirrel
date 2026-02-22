import { NotNullish } from '../../util/CommonUtil.ts'
import lodash from 'lodash'
import SiteTagFullDTO from './SiteTagFullDTO.ts'

export default class SiteTagFullWithWorkIdDTO extends SiteTagFullDTO {
  /**
   * 绑定的本地标签的实例
   */
  workId: number | undefined | null

  constructor(siteTag?: SiteTagFullDTO) {
    super(siteTag)
    if (NotNullish(siteTag)) {
      lodash.assign(this, lodash.pick(siteTag, ['workId']))
    }
  }
}
