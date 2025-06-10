import BaseQueryDTO from '../../base/BaseQueryDTO.js'
import { NotNullish } from '../../util/CommonUtil.ts'

/**
 * QueryDTO
 * 作品
 */
export default class WorksQueryDTO extends BaseQueryDTO {
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

  constructor(worksQueryDTO?: WorksQueryDTO) {
    super(worksQueryDTO)
    if (NotNullish(worksQueryDTO)) {
      this.siteId = worksQueryDTO.siteId
      this.siteWorksId = worksQueryDTO.siteWorksId
      this.siteWorksName = worksQueryDTO.siteWorksName
      this.siteAuthorId = worksQueryDTO.siteAuthorId
      this.siteWorkDescription = worksQueryDTO.siteWorkDescription
      this.siteUploadTime = worksQueryDTO.siteUploadTime
      this.siteUpdateTime = worksQueryDTO.siteUpdateTime
      this.nickName = worksQueryDTO.nickName
      this.lastView = worksQueryDTO.lastView
    }
  }
}
