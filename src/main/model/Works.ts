import BaseModel from './BaseModel'

/**
 * 作品
 */
export default class Works extends BaseModel {
  /**
   * 主键
   */
  id: number | undefined | null
  /**
   * 文件存储路径
   */
  filePath: string | undefined | null
  /**
   * 作品来源站点id
   */
  siteId: number | undefined | null
  /**
   * 站点中作品的id
   */
  siteWorksId: string | undefined | null
  /**
   * 站点中作品的作者id
   */
  siteAuthorId: string | undefined | null
  /**
   * 站点中作品的上传时间
   */
  siteUploadTime: string | undefined | null
  /**
   * 站点这种作品最后修改的时间
   */
  siteUpdateTime: string | undefined | null
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
  includeTime: string | undefined | null
  /**
   * 收录方式（0：本地导入，1：站点下载）
   */
  includeMode: number | undefined | null
  /**
   * 下载状态
   */
  downloadStatus: number | undefined | null
  /**
   * 下载任务id
   */
  downloadTaskId: number | undefined | null

  constructor(works: Works) {
    super(works)
    this.id = works.id
    this.filePath = works.filePath
    this.siteId = works.siteId
    this.siteWorksId = works.siteWorksId
    this.siteAuthorId = works.siteAuthorId
    this.siteUploadTime = works.siteUploadTime
    this.siteUpdateTime = works.siteUpdateTime
    this.nickName = works.nickName
    this.localAuthorId = works.localAuthorId
    this.includeTime = works.includeTime
    this.includeMode = works.includeMode
    this.downloadStatus = works.downloadStatus
    this.downloadTaskId = works.downloadTaskId
  }
}
