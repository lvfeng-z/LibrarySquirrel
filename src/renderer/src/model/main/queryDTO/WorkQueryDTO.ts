import BaseQueryDTO from './BaseQueryDTO.ts'
import { NotNullish } from '../../../utils/CommonUtil'

/**
 * QueryDTO
 * 作品
 */
export default class WorkQueryDTO extends BaseQueryDTO {
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
   * 作品来源站点id
   */
  siteId: number | undefined | null
  /**
   * 站点中作品的id
   */
  siteWorkId: string | undefined | null
  /**
   * 站点中作品的名称
   */
  siteWorkName: string | undefined | null
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

  constructor(workQueryDTO?: WorkQueryDTO) {
    super(workQueryDTO)
    if (NotNullish(workQueryDTO)) {
      this.filePath = workQueryDTO.filePath
      this.fileName = workQueryDTO.fileName
      this.filenameExtension = workQueryDTO.filenameExtension
      this.siteId = workQueryDTO.siteId
      this.siteWorkId = workQueryDTO.siteWorkId
      this.siteWorkName = workQueryDTO.siteWorkName
      this.siteAuthorId = workQueryDTO.siteAuthorId
      this.siteWorkDescription = workQueryDTO.siteWorkDescription
      this.siteUploadTime = workQueryDTO.siteUploadTime
      this.siteUpdateTime = workQueryDTO.siteUpdateTime
      this.nickName = workQueryDTO.nickName
      this.suggestedName = workQueryDTO.suggestedName
      this.importMethod = workQueryDTO.importMethod
      this.taskId = workQueryDTO.taskId
      this.lastView = workQueryDTO.lastView
      this.resourceComplete = workQueryDTO.resourceComplete
    }
  }
}
