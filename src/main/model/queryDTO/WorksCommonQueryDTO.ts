import { NotNullish } from '../../util/CommonUtil.ts'
import WorksQueryDTO from './WorksQueryDTO.js'
import lodash from 'lodash'
import BaseQueryDTO from '../../base/BaseQueryDTO.js'

/**
 * QueryDTO
 * 作品
 */
export default class WorksCommonQueryDTO extends WorksQueryDTO {
  /**
   * 包含本地标签
   */
  includeLocalTagIds?: (string | number)[]
  /**
   * 排除本地标签
   */
  excludeLocalTagIds?: (string | number)[]
  /**
   * 包含站点标签
   */
  includeSiteTagIds?: (string | number)[]
  /**
   * 排除站点标签
   */
  excludeSiteTagIds?: (string | number)[]
  /**
   * 包含本地作者
   */
  includeLocalAuthorIds?: (string | number)[]
  /**
   * 排除本地作者
   */
  excludeLocalAuthorIds?: (string | number)[]
  /**
   * 包含站点作者
   */
  includeSiteAuthorIds?: (string | number)[]
  /**
   * 排除站点作者
   */
  excludeSiteAuthorIds?: (string | number)[]

  constructor(worksQueryDTO?: WorksQueryDTO) {
    super(worksQueryDTO)
    if (NotNullish(worksQueryDTO)) {
      lodash.assign(
        this,
        lodash.pick(worksQueryDTO, [
          'includeLocalTagIds',
          'excludeLocalTagIds',
          'includeSiteTagIds',
          'excludeSiteTagIds',
          'includeLocalAuthorIds',
          'excludeLocalAuthorIds',
          'includeSiteAuthorIds',
          'excludeSiteAuthorIds'
        ])
      )
    }
  }

  public static nonFieldProperties(): string[] {
    return [
      ...BaseQueryDTO.nonFieldProperties(),
      'includeLocalTagIds',
      'excludeLocalTagIds',
      'includeSiteTagIds',
      'excludeSiteTagIds',
      'includeLocalAuthorIds',
      'excludeLocalAuthorIds',
      'includeSiteAuthorIds',
      'excludeSiteAuthorIds'
    ]
  }
}
