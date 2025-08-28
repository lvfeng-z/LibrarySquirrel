import LocalTag from '../entity/LocalTag.js'
import lodash from 'lodash'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'
import { ParsePropertyFromJson } from '@renderer/utils/ObjectUtil.ts'

export default class LocalTagDTO extends LocalTag {
  /**
   * 是否为叶子节点
   */
  isLeaf: boolean | undefined | null

  /**
   * 基础标签
   */
  baseTag: LocalTag | undefined | null

  constructor(localTagDTO?: LocalTag) {
    super(localTagDTO)
    if (NotNullish(localTagDTO)) {
      lodash.assign(this, lodash.pick(localTagDTO, ['isLeaf', 'baseTag']))
      ParsePropertyFromJson(this, [{ property: 'baseTag', builder: (src) => new LocalTag(src) }])
    }
  }
}
