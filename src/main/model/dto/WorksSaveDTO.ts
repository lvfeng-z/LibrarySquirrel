import WorksPluginDTO from './WorksPluginDTO.ts'
import { isNullish } from '../../util/CommonUtil.ts'

/**
 * 保存作品信息和资源的DTO
 */
export default class WorksSaveDTO extends WorksPluginDTO {
  /**
   * 保存路径
   */
  fullSavePath: string | undefined | null

  constructor(worksSaveDTO?: WorksSaveDTO | WorksPluginDTO) {
    if (isNullish(worksSaveDTO)) {
      super()
      this.fullSavePath = undefined
    } else if (worksSaveDTO instanceof WorksSaveDTO) {
      super(worksSaveDTO)
      this.fullSavePath = worksSaveDTO.fullSavePath
    } else {
      super(worksSaveDTO)
      this.fullSavePath = undefined
    }
  }
}
