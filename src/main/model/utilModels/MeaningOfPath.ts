import LocalAuthor from '../LocalAuthor.ts'
import LocalTag from '../LocalTag.ts'
import Works from '../Works.ts'
import WorksSet from '../WorksSet.ts'
import Site from '../Site.ts'

/**
 * 目录含义
 */
export class MeaningOfPath {
  /**
   * 类型
   */
  type: PathType

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
      this.type = 'unknown'
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

export type PathType =
  | 'author'
  | 'tag'
  | 'worksName'
  | 'worksSetName'
  | 'siteName'
  | 'createTime'
  | 'unknown'
