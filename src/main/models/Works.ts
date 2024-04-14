/**
 * 作品
 */
export default class Works {
  /**
   * 主键
   */
  id: number //主键
  /**
   * 文件存储路径
   */
  filePath: string //文件存储路径
  /**
   * 作品来源站点id
   */
  siteId: number //作品来源站点id
  /**
   * 站点中作品的id
   */
  siteWorksId: string //作品在站点的id
  /**
   * 站点中作品的作者id
   */
  siteAuthorId: string //作品在站点的作者id
  /**
   * 站点中作品的上传时间
   */
  siteUploadTime: string //作品在站点的上传时间
  /**
   * 站点这种作品最后修改的时间
   */
  siteUpdateTime: string //作品在站点最后修改的时间
  /**
   * 作品别称
   */
  nickName: string //作品别称
  /**
   * 在本地作品的作者id
   */
  localAuthorId: number //作品在本地的作者id
  /**
   * 收录时间
   */
  includeTime: string
  /**
   * 收录方式（0：本地导入，1：站点下载）
   */
  includeMode: number
  /**
   * 下载状态
   */
  downloadStatus: number //下载状态
  /**
   * 下载任务id
   */
  downloadTaskId: number //下载任务id

  constructor(works: Works) {
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
