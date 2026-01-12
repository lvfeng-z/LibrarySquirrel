import WorksSet from '../entity/WorksSet.ts'
import WorksFullDTO from './WorksFullDTO.ts'
import { IsNullish } from '@renderer/utils/CommonUtil.ts'

export default class WorksSetWithWorksDTO {
  /**
   * 作品集
   */
  worksSet: WorksSet

  /**
   * 作品集的作品列表
   */
  worksList: WorksFullDTO[]

  constructor(worksSet: WorksSet, worksList?: WorksFullDTO[]) {
    this.worksSet = worksSet
    this.worksList = IsNullish(worksList) ? [] : worksList
  }
}
