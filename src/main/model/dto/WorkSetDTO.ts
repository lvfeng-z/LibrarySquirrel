import WorkSet from '../entity/WorkSet.ts'
import { IsNullish } from '../../util/CommonUtil.ts'

export default class WorkSetDTO extends WorkSet {
  constructor(workSetDTO?: WorkSetDTO) {
    if (IsNullish(workSetDTO)) {
      super()
    } else {
      super(workSetDTO)
    }
  }
}
