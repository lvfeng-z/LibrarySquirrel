import LocalTag from '../entity/LocalTag.js'
import lodash from 'lodash'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

export default class LocalTagDTO extends LocalTag {
  /**
   * 是否为叶子节点
   */
  isLeaf: boolean | undefined | null

  /**
   * 基础标签
   */
  baseTag: LocalTag | undefined | null

  constructor(localTagDTO?: LocalTagDTO) {
    super(localTagDTO)
    if (NotNullish(localTagDTO)) {
      const baseTag = lodash.pick(localTagDTO, ['baseTag'])
      if (typeof baseTag === 'string') {
        localTagDTO.baseTag = JSON.parse(baseTag)
      }
      lodash.assign(this, lodash.pick(localTagDTO, ['isLeaf', 'baseTag']))
    }
  }
}
