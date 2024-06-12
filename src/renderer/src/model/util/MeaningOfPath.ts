import LocalAuthor from '../main/LocalAuthor.ts'
import LocalTag from '../main/LocalTag.ts'
import Works from '../main/Works.ts'
import WorksSet from '../main/WorksSet.ts'
import Site from '../main/Site.ts'

/**
 * 目录含义
 */
export class MeaningOfPath {
  /**
   * 类型
   */
  type: PathType

  /**
   * 名称
   */
  name: string | null | undefined

  /**
   * 详细信息
   */
  description: LocalAuthor | LocalTag | Works | WorksSet | Site | null | undefined

  constructor(meaningOfPath?: MeaningOfPath) {
    if (meaningOfPath === undefined) {
      this.type = 'unknown'
      this.name = undefined
      this.description = undefined
    } else {
      this.type = meaningOfPath.type
      this.name = meaningOfPath.name
      this.description = meaningOfPath.description
    }
  }
}

export type PathType = 'author' | 'tag' | 'worksName' | 'worksSetName' | 'siteName' | 'createTime' | 'unknown'
