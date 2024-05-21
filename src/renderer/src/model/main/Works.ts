/**
 * 作品
 */
export default interface Works {
  /**
   * 主键
   */
  id?: number | undefined | null
  /**
   * 创建时间
   */
  createTime?: number | null | undefined

  /**
   * 更新时间
   */
  updateTime?: number | null | undefined
  /**
   * 文件存储路径（文件相对于工作目录的相对路径）
   */
  filePath?: string | undefined | null
  /**
   * 作品类型（0：图片，1：视频，2：文章）
   */
  worksType?: number | undefined | null
  /**
   * 作品来源站点id
   */
  siteId?: number | undefined | null
  /**
   * 站点中作品的id
   */
  siteWorksId?: string | undefined | null
  /**
   * 站点中作品的名称
   */
  siteWorksName?: string | undefined | null
  /**
   * 站点中作品的作者id
   */
  siteAuthorId?: string | undefined | null
  /**
   * 站点中作品的描述
   */
  siteWorkDescription?: string | undefined | null
  /**
   * 站点中作品的上传时间
   */
  siteUploadTime?: string | undefined | null
  /**
   * 站点这种作品最后修改的时间
   */
  siteUpdateTime?: string | undefined | null
  /**
   * 作品别称
   */
  nickName?: string | undefined | null
  /**
   * 在本地作品的作者id
   */
  localAuthorId?: number | undefined | null
  /**
   * 收录时间
   */
  includeTime?: string | undefined | null
  /**
   * 收录方式（0：本地导入，1：站点下载）
   */
  includeMode?: number | undefined | null
  /**
   * 收录任务id
   */
  includeTaskId?: number | undefined | null
  /**
   * 下载状态
   */
  downloadStatus?: number | undefined | null
}
