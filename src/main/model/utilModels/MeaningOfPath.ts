import LocalAuthor from '../LocalAuthor.ts'
import LocalTag from '../LocalTag.ts'
import Works from '../Works.ts'
import WorksSet from '../WorksSet.ts'
import Site from '../Site.ts'

/**
 * 目录含义
 */
export default class MeaningOfPath {
  /**
   * 类型
   */
  type: 'author' | 'tag' | 'worksName' | 'worksSetName' | 'siteName' | 'createTime' | 'unknown'

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
