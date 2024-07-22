import LocalAuthor from '../main/LocalAuthor.ts'
import LocalTag from '../main/LocalTag.ts'
import Works from '../main/Works.ts'
import WorksSet from '../main/WorksSet.ts'
import Site from '../main/Site.ts'
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
  details: LocalAuthor | LocalTag | Works | WorksSet | Site | null | undefined

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
