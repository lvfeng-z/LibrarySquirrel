import BaseEntity from '../../base/BaseEntity.js'
import { NotNullish } from '../../util/CommonUtil.js'

export default class Resource extends BaseEntity {
  /**
   * 作品id
   */
  worksId: number | undefined | null

  /**
   * 任务id
   */
  taskId: number | undefined | null

  /**
   * 状态（0：停用，1：启用）
   */
  state: number | undefined | null

  /**
   * 文件路径
   */
  filePath: string | undefined | null

  /**
   * 文件名
   */
  fileName: string | undefined | null

  /**
   * 扩展名
   */
  filenameExtension: string | undefined | null

  /**
   * 建议名称
   */
  suggestedName: string | undefined | null

  /**
   * 工作目录
   */
  workdir: string | undefined | null

  /**
   * 资源是否保存完成
   */
  resourceComplete: number | undefined | null

  /**
   * 导入方式（0：本地导入，1：站点下载）
   */
  importMethod: number | undefined | null

  constructor(resource?: Resource) {
    super(resource)
    if (NotNullish(resource)) {
      this.worksId = resource.worksId
      this.taskId = resource.taskId
      this.state = resource.state
      this.filePath = resource.filePath
      this.fileName = resource.fileName
      this.filenameExtension = resource.filenameExtension
      this.suggestedName = resource.suggestedName
      this.workdir = resource.workdir
      this.resourceComplete = resource.resourceComplete
      this.importMethod = resource.importMethod
    }
  }
}
