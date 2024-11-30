import BaseEntity from './BaseEntity.ts'
import { isNullish } from '../../util/CommonUtil.ts'

/**
 * 作品集合
 */
export default class WorksSet extends BaseEntity {
  /**
   * 主键
   */
  id: number | undefined | null
  /**
   * 集合来源站点id
   */
  siteId: number | undefined | null
  /**
   * 集合在站点的id
   */
  siteWorksSetId: string | undefined | null
  /**
   * 集合在站点的名称
   */
  siteWorksSetName: string | undefined | null
  /**
   * 集合在站点的作者id
   */
  siteAuthorId: string | undefined | null
  /**
   * 集合在站点的上传时间
   */
  siteUploadTime: string | undefined | null
  /**
   * 集合在站点最后更新的时间
   */
  siteUpdateTime: string | undefined | null
  /**
   * 别名
   */
  nickName: string | undefined | null
  /**
   * 最后一次查看的时间
   */
  lastView: number | undefined | null

  constructor(worksSet?: WorksSet) {
    if (isNullish(worksSet)) {
      super()
      this.id = undefined
      this.siteId = undefined
      this.siteWorksSetId = undefined
      this.siteWorksSetName = undefined
      this.siteAuthorId = undefined
      this.siteUploadTime = undefined
      this.siteUpdateTime = undefined
      this.nickName = undefined
      this.lastView = undefined
    } else {
      super(worksSet)
      this.id = worksSet.id
      this.siteId = worksSet.siteId
      this.siteWorksSetId = worksSet.siteWorksSetId
      this.siteWorksSetName = worksSet.siteWorksSetName
      this.siteAuthorId = worksSet.siteAuthorId
      this.siteUploadTime = worksSet.siteUploadTime
      this.siteUpdateTime = worksSet.siteUpdateTime
      this.nickName = worksSet.nickName
      this.lastView = worksSet.lastView
    }
  }
}
