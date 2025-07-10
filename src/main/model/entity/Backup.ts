import BaseEntity from '../../base/BaseEntity.js'
import { BackupSourceTypeEnum } from '../../constant/BackupSourceTypeEnum.js'
import lodash from 'lodash'
import { NotNullish } from '../../util/CommonUtil.js'

export default class Backup extends BaseEntity {
  /**
   * 来源类型
   */
  sourceType: BackupSourceTypeEnum | undefined | null

  /**
   * 源id
   */
  sourceId: number | undefined | null

  /**
   * 文件名
   */
  fileName: string | undefined | null

  /**
   * 文件路径
   */
  filePath: string | undefined | null

  /**
   * 工作目录
   */
  workdir: string | undefined | null

  constructor(backup?: Backup) {
    super()
    if (NotNullish(backup)) {
      lodash.assign(this, lodash.pick(backup, ['sourceType', 'sourceId', 'fileName', 'filePath']))
    }
  }
}
