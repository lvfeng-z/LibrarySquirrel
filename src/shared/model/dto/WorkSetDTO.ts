import WorkSet from '../entity/WorkSet.ts'
import { isNullish } from '../../util/CommonUtil.ts'

export default class WorkSetDTO extends WorkSet {
  constructor(workSetDTO?: WorkSetDTO) {
    if (isNullish(workSetDTO)) {
      super()
    } else {
      super(workSetDTO)
    }
  }
}
