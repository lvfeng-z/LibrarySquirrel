import WorksSet from '../entity/WorksSet.ts'
import { IsNullish } from '../../util/CommonUtil.ts'

export default class WorksSetDTO extends WorksSet {
  constructor(worksSetDTO?: WorksSetDTO) {
    if (IsNullish(worksSetDTO)) {
      super()
    } else {
      super(worksSetDTO)
    }
  }
}
