import BaseEntity from './BaseEntity.ts'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

/**
 * 作品
 */
export default class Works extends BaseEntity {
  /**
   * 作品来源站点id
   */
  siteId: number | undefined | null
  /**
   * 站点中作品的id
   */
  siteWorksId: string | undefined | null
  /**
   * 站点中作品的名称
   */
  siteWorksName: string | undefined | null
  /**
   * 站点中作品的作者id
   */
  siteAuthorId: string | undefined | null
  /**
   * 站点中作品的描述
   */
  siteWorkDescription: string | undefined | null
  /**
   * 站点中作品的上传时间
   */
  siteUploadTime: number | undefined | null
  /**
   * 站点中作品最后修改的时间
   */
  siteUpdateTime: number | undefined | null
  /**
   * 作品别称
   */
  nickName: string | undefined | null
  /**
   * 最后一次查看的时间
   */
  lastView: number | undefined | null

  constructor(works?: Works) {
    super(works)
    if (NotNullish(works)) {
      this.siteId = works.siteId
      this.siteWorksId = works.siteWorksId
      this.siteWorksName = works.siteWorksName
      this.siteWorkDescription = works.siteWorkDescription
      this.siteAuthorId = works.siteAuthorId
      this.siteUploadTime = works.siteUploadTime
      this.siteUpdateTime = works.siteUpdateTime
      this.nickName = works.nickName
      this.lastView = works.lastView
    }
  }
}
