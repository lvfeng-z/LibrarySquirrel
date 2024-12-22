import BaseQueryDTO from './BaseQueryDTO.ts'
import { isNullish } from '../../util/CommonUtil.ts'

/**
 * QueryDTO
 * 作品
 */
export default class WorksQueryDTO extends BaseQueryDTO {
  /**
   * 包含本地标签
   */
  includeLocalTagIds: (string | number)[]
  /**
   * 排除本地标签
   */
  excludeLocalTagIds: (string | number)[]
  /**
   * 包含站点标签
   */
  includeSiteTagIds: (string | number)[]
  /**
   * 排除站点标签
   */
  excludeSiteTagIds: (string | number)[]
  /**
   * 包含本地作者
   */
  includeLocalAuthorIds: (string | number)[]
  /**
   * 排除本地作者
   */
  excludeLocalAuthorIds: (string | number)[]
  /**
   * 包含站点作者
   */
  includeSiteAuthorIds: (string | number)[]
  /**
   * 排除站点作者
   */
  excludeSiteAuthorIds: (string | number)[]

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

  constructor(worksQueryDTO?: WorksQueryDTO) {
    if (isNullish(worksQueryDTO)) {
      super()
      this.includeLocalTagIds = []
      this.excludeLocalTagIds = []
      this.includeSiteTagIds = []
      this.excludeSiteTagIds = []
      this.includeLocalAuthorIds = []
      this.excludeLocalAuthorIds = []
      this.includeSiteAuthorIds = []
      this.excludeSiteAuthorIds = []
      this.filePath = undefined
      this.fileName = undefined
      this.filenameExtension = undefined
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
      super(worksQueryDTO)
      this.includeLocalTagIds = worksQueryDTO.includeLocalTagIds
      this.excludeLocalTagIds = worksQueryDTO.excludeLocalTagIds
      this.includeSiteTagIds = worksQueryDTO.includeSiteTagIds
      this.excludeSiteTagIds = worksQueryDTO.excludeSiteTagIds
      this.includeLocalAuthorIds = worksQueryDTO.includeLocalAuthorIds
      this.excludeLocalAuthorIds = worksQueryDTO.excludeLocalAuthorIds
      this.includeSiteAuthorIds = worksQueryDTO.includeSiteAuthorIds
      this.excludeSiteAuthorIds = worksQueryDTO.excludeSiteAuthorIds
      this.filePath = worksQueryDTO.filePath
      this.fileName = worksQueryDTO.fileName
      this.filenameExtension = worksQueryDTO.filenameExtension
      this.siteId = worksQueryDTO.siteId
      this.siteWorksId = worksQueryDTO.siteWorksId
      this.siteWorksName = worksQueryDTO.siteWorksName
      this.siteAuthorId = worksQueryDTO.siteAuthorId
      this.siteWorkDescription = worksQueryDTO.siteWorkDescription
      this.siteUploadTime = worksQueryDTO.siteUploadTime
      this.siteUpdateTime = worksQueryDTO.siteUpdateTime
      this.nickName = worksQueryDTO.nickName
      this.suggestedName = worksQueryDTO.suggestedName
      this.importMethod = worksQueryDTO.importMethod
      this.taskId = worksQueryDTO.taskId
      this.lastView = worksQueryDTO.lastView
      this.resourceComplete = worksQueryDTO.resourceComplete
    }
  }
}
