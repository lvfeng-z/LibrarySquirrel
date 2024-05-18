import BaseModel from './BaseModel'

/**
 * 作品
 */
export default class Works extends BaseModel {
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
   * 收录任务id
   */
  includeTaskId: number | undefined | null
  /**
   * 下载状态
   */
  downloadStatus: number | undefined | null

  constructor(works?: Works) {
    if (works === undefined) {
      super()
      this.filePath = undefined
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
      super(works)
      this.filePath = works.filePath
      this.siteId = works.siteId
      this.siteWorksId = works.siteWorksId
      this.siteWorksName = works.siteWorksName
      this.siteWorkDescription = works.siteWorkDescription
      this.siteAuthorId = works.siteAuthorId
      this.siteUploadTime = works.siteUploadTime
      this.siteUpdateTime = works.siteUpdateTime
      this.nickName = works.nickName
      this.localAuthorId = works.localAuthorId
      this.includeTime = works.includeTime
      this.includeMode = works.includeMode
      this.includeTaskId = works.includeTaskId
      this.downloadStatus = works.downloadStatus
    }
  }
}
