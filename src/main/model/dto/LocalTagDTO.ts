import LocalTag from '../entity/LocalTag.js'
import lodash from 'lodash'
import { NotNullish } from '../../util/CommonUtil.js'

export default class LocalTagDTO extends LocalTag {
  /**
   * 是否为叶子节点
   * @private
   */
  isLeaf: boolean | undefined | null

  constructor(localTagDTO?: LocalTagDTO) {
    super(localTagDTO)
    if (NotNullish(localTagDTO)) {
      lodash.assign(this, lodash.pick(localTagDTO, ['isLeaf']))
    }
  }
}
