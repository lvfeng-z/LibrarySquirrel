import LocalTag from '../entity/LocalTag.js'
import lodash from 'lodash'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'
import SelectItem from '@renderer/model/util/SelectItem.ts'
import LocalTagDTO from '@renderer/model/main/dto/LocalTagDTO.ts'

export default class LocalTagVO extends LocalTag {
  /**
   * 基础标签
   */
  baseTag: SelectItem | undefined | null

  constructor(localTagDTO?: LocalTagDTO) {
    super(localTagDTO)
    if (NotNullish(localTagDTO)) {
      const baseTag = lodash.pick(localTagDTO, ['baseTag']).baseTag
      if (NotNullish(baseTag)) {
        this.baseTag = new SelectItem({ value: String(baseTag.id), label: String(baseTag.localTagName) })
      }
    }
  }
}
