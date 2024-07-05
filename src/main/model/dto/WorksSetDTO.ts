import WorksSet from '../WorksSet.ts'
import { isNullish } from '../../util/CommonUtil.ts'

export default class WorksSetDTO extends WorksSet {
  constructor(worksSetDTO?: WorksSetDTO) {
    if (isNullish(worksSetDTO)) {
      super()
    } else {
      super(worksSetDTO)
    }
  }
}
