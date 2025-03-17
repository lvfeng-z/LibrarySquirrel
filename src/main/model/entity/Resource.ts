import BaseEntity from '../../base/BaseEntity.js'

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
}
