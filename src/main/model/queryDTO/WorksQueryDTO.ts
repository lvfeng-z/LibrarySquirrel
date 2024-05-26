/**
 * QueryDTO
 * 作品
 */
import BaseQueryDTO from './BaseQueryDTO.ts'

export default class WorksQueryDTO extends BaseQueryDTO {
  /**
   * 包含本地标签
   */
  includeLocalTagIds: string[] | number[] | null | undefined
  /**
   * 排除本地标签
   */
  excludeLocalTagIds: string[] | number[] | null | undefined
  /**
   * 包含站点标签
   */
  includeSiteTagIds: string[] | number[] | null | undefined
  /**
   * 排除站点标签
   */
  excludeSiteTagIds: string[] | number[] | null | undefined

  /**
   * 文件存储路径（文件相对于工作目录的相对路径）
   */
  filePath: string | undefined | null
  /**
   * 作品类型（0：图片，1：视频，2：文章）
   */
  worksType: number | undefined | null
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
   * 在本地作品的作者id
   */
  localAuthorId: number | undefined | null
  /**
   * 收录时间
   */
  includeTime: number | undefined | null
  /**
   * 收录方式（0：本地导入，1：站点下载）
   */
  includeMode: number | undefined | null
  /**
   * 收录任务id
   */
  includeTaskId: number | undefined | null
  /**
   * 下载状态
   */
  downloadStatus: number | undefined | null

  constructor(worksQueryDTO?: WorksQueryDTO) {
    if (worksQueryDTO === undefined) {
      super()
      this.includeLocalTagIds = undefined
      this.excludeLocalTagIds = undefined
      this.includeSiteTagIds = undefined
      this.includeSiteTagIds = undefined
      this.filePath = undefined
      this.worksType = undefined
      this.siteId = undefined
      this.siteWorksId = undefined
      this.siteWorksName = undefined
      this.siteAuthorId = undefined
      this.siteWorkDescription = undefined
      this.siteUploadTime = undefined
      this.siteUpdateTime = undefined
      this.nickName = undefined
      this.localAuthorId = undefined
      this.includeTime = undefined
      this.includeMode = undefined
      this.includeTaskId = undefined
      this.downloadStatus = undefined
    } else {
      super(worksQueryDTO)
      this.includeLocalTagIds = worksQueryDTO.includeLocalTagIds
      this.excludeLocalTagIds = worksQueryDTO.excludeLocalTagIds
      this.includeSiteTagIds = worksQueryDTO.includeSiteTagIds
      this.excludeSiteTagIds = worksQueryDTO.excludeSiteTagIds
      this.filePath = worksQueryDTO.filePath
      this.worksType = worksQueryDTO.worksType
      this.siteId = worksQueryDTO.siteId
      this.siteWorksId = worksQueryDTO.siteWorksId
      this.siteWorksName = worksQueryDTO.siteWorksName
      this.siteAuthorId = worksQueryDTO.siteAuthorId
      this.siteWorkDescription = worksQueryDTO.siteWorkDescription
      this.siteUploadTime = worksQueryDTO.siteUploadTime
      this.siteUpdateTime = worksQueryDTO.siteUpdateTime
      this.nickName = worksQueryDTO.nickName
      this.localAuthorId = worksQueryDTO.localAuthorId
      this.includeTime = worksQueryDTO.includeTime
      this.includeMode = worksQueryDTO.includeMode
      this.includeTaskId = worksQueryDTO.includeTaskId
      this.downloadStatus = worksQueryDTO.downloadStatus
    }
  }
}
