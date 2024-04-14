/**
 * 作品集合
 */

export default class WorksSet {
  /**
   * 主键
   */
  id: string
  /**
   * 集合名称
   */
  setName: string
  /**
   * 集合来源站点id
   */
  siteId: number
  /**
   * 集合在站点的id
   */
  siteWorksId: string
  /**
   * 集合在站点的名称
   */
  siteWorksName: string
  /**
   * 集合在站点的作者id
   */
  siteAuthorId: string
  /**
   * 集合在站点的上传时间
   */
  siteUploadTime: string
  /**
   * 集合在站点最后更新的时间
   */
  siteUpdateTime: string
  /**
   * 别名
   */
  nickName: string
  /**
   * 集合在本地的作者
   */
  localAuthorId: number
  /**
   * 创建时间
   */
  createTime: number
  constructor(worksSet: WorksSet) {
    this.id = worksSet.id
    this.setName = worksSet.setName
    this.siteId = worksSet.siteId
    this.siteWorksId = worksSet.siteWorksId
    this.siteWorksName = worksSet.siteWorksName
    this.siteAuthorId = worksSet.siteAuthorId
    this.siteUploadTime = worksSet.siteUploadTime
    this.siteUpdateTime = worksSet.siteUpdateTime
    this.nickName = worksSet.nickName
    this.localAuthorId = worksSet.localAuthorId
    this.createTime = worksSet.createTime
  }
}
