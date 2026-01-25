import LocalAuthor from '../main/entity/LocalAuthor.ts'
import LocalTag from '../main/entity/LocalTag.ts'
import Work from '../main/entity/Work.ts'
import WorkSet from '../main/entity/WorkSet.ts'
import Site from '../main/entity/Site.ts'
import { PathTypeEnum } from '../../constants/PathTypeEnum.ts'

/**
 * 目录含义
 */
export class MeaningOfPath {
  /**
   * 类型
   */
  type: PathTypeEnum

  /**
   * 主键
   */
  id: number | string | null | undefined

  /**
   * 名称
   */
  name: string | null | undefined

  /**
   * 详细信息
   */
  details: LocalAuthor | LocalTag | Work | WorkSet | Site | null | undefined

  constructor(meaningOfPath?: MeaningOfPath) {
    if (meaningOfPath === undefined) {
      this.type = PathTypeEnum.UNKNOWN
      this.id = undefined
      this.name = undefined
      this.details = undefined
    } else {
      this.type = meaningOfPath.type
      this.id = meaningOfPath.id
      this.name = meaningOfPath.name
      this.details = meaningOfPath.details
    }
  }
}
