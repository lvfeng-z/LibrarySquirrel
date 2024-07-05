import BaseModel from './BaseModel.ts'
import { isNullish } from '../util/CommonUtil.ts'

/**
 * 作品
 */
export default class Works extends BaseModel {
  /**
   * 文件存储路径（文件相对于工作目录的相对路径）
   */
  filePath: string | undefined | null
  /**
   * 扩展名
   */
  filenameExtension: string | undefined | null
  /**
   * 文件所在工作目录（冗余）
   */
  workdir: string | undefined | null
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
   * 收录方式（0：本地导入，1：站点下载）
   */
  includeMode: number | undefined | null
  /**
   * 收录任务id
   */
  includeTaskId: number | undefined | null
  /**
   * 最后一次查看的时间
   */
  lastViewed: number | undefined | null

  constructor(works?: Works) {
    if (isNullish(works)) {
      super()
      this.filePath = undefined
      this.filenameExtension = undefined
      this.workdir = undefined
      this.siteId = undefined
      this.siteWorksId = undefined
      this.siteWorksName = undefined
      this.siteAuthorId = undefined
      this.siteWorkDescription = undefined
      this.siteUploadTime = undefined
      this.siteUpdateTime = undefined
      this.nickName = undefined
      this.includeMode = undefined
      this.includeTaskId = undefined
      this.lastViewed = undefined
    } else {
      super(works)
      this.filePath = works.filePath
      this.filenameExtension = works.filenameExtension
      this.workdir = works.workdir
      this.siteId = works.siteId
      this.siteWorksId = works.siteWorksId
      this.siteWorksName = works.siteWorksName
      this.siteWorkDescription = works.siteWorkDescription
      this.siteAuthorId = works.siteAuthorId
      this.siteUploadTime = works.siteUploadTime
      this.siteUpdateTime = works.siteUpdateTime
      this.nickName = works.nickName
      this.includeMode = works.includeMode
      this.includeTaskId = works.includeTaskId
      this.lastViewed = works.lastViewed
    }
  }
}
