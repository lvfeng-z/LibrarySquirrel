import BaseModel from './BaseModel.ts'
import { isNullish } from '@renderer/utils/CommonUtil.ts'

/**
 * 作品
 */
export default class Works extends BaseModel {
  /**
   * 主键
   */
  id: number | undefined | null
  /**
   * 文件存储路径（文件相对于工作目录的相对路径）
   */
  filePath: string | undefined | null
  /**
   * 文件名称
   */
  fileName: string | undefined | null
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
   * 建议名称
   */
  suggestedName: string | undefined | null
  /**
   * 导入方式（0：本地导入，1：站点下载）
   */
  importMethod: number | undefined | null
  /**
   * 任务id
   */
  taskId: number | undefined | null
  /**
   * 最后一次查看的时间
   */
  lastView: number | undefined | null
  /**
   * 资源保存完成
   */
  resourceComplete: boolean | undefined | null

  constructor(works?: Works) {
    if (isNullish(works)) {
      super()
      this.id = undefined
      this.filePath = undefined
      this.fileName = undefined
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
      this.suggestedName = undefined
      this.importMethod = undefined
      this.taskId = undefined
      this.lastView = undefined
      this.resourceComplete = undefined
    } else {
      super(works)
      this.id = works.id
      this.filePath = works.filePath
      this.fileName = works.fileName
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
      this.suggestedName = works.suggestedName
      this.importMethod = works.importMethod
      this.taskId = works.taskId
      this.lastView = works.lastView
      this.resourceComplete = works.resourceComplete
    }
  }
}
