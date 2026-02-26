import BaseQueryDTO from '../base/BaseQueryDTO.ts'
import { NotNullish } from '../../util/CommonUtil.ts'
import lodash from 'lodash'

export default class SecureStorageQueryDTO extends BaseQueryDTO {
  /**
   * 存储键
   */
  storageKey?: string | undefined | null

  /**
   * 描述
   */
  description?: string | undefined | null

  constructor(baseQueryDTO?: BaseQueryDTO) {
    super()
    if (NotNullish(baseQueryDTO)) {
      lodash.assign(this, lodash.pick(baseQueryDTO, ['storageKey', 'description']))
    }
  }
}
