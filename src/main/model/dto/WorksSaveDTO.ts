import { IsNullish } from '../../util/CommonUtil.ts'
import WorksDTO from './WorksDTO.js'
import lodash from 'lodash'

/**
 * 保存作品信息和资源的DTO
 */
export default class WorksSaveDTO extends WorksDTO {
  /**
   * 保存路径
   */
  fullSavePath: string | undefined | null

  constructor(worksSaveDTO?: WorksDTO) {
    super(worksSaveDTO)
    if (IsNullish(worksSaveDTO)) {
      lodash.assign(this, lodash.pick(worksSaveDTO, ['fullSavePath']))
    }
  }
}
