import { BackupSourceTypeEnum } from '../../constant/BackupSourceTypeEnum.js'
import { BaseQueryDTO } from '../../base/BaseQueryDTO.js'
import { NotNullish } from '../../util/CommonUtil.js'
import lodash from 'lodash'

export default class BackupQueryDTO extends BaseQueryDTO {
  /**
   * 来源类型
   */
  sourceType?: BackupSourceTypeEnum | undefined | null

  /**
   * 原id
   */
  sourceId?: number | undefined | null

  /**
   * 文件名
   */
  fileName?: string | undefined | null

  /**
   * 文件路径
   */
  filePath?: string | undefined | null

  /**
   * 工作目录
   */
  workdir?: string | undefined | null

  constructor(baseQueryDTO?: BaseQueryDTO) {
    super()
    if (NotNullish(baseQueryDTO)) {
      lodash.assign(this, lodash.pick(baseQueryDTO, ['sourceType', 'sourceId', 'fileName', 'filePath']))
    }
  }
}
