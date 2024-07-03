import WorksSet from '../WorksSet.ts'

export default class WorksSetDTO extends WorksSet {
  constructor(worksSetDTO?: WorksSetDTO) {
    if (worksSetDTO === undefined || worksSetDTO === null) {
      super()
    } else {
      super(worksSetDTO)
    }
  }
}
