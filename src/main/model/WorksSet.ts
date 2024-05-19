import BaseModel from './BaseModel.ts'

/**
 * 作品集合
 */
export default class WorksSet extends BaseModel {
  /**
   * 主键
   */
  id: string | undefined | null
  /**
   * 集合名称
   */
  setName: string | undefined | null
  /**
   * 集合来源站点id
   */
  siteId: number | undefined | null
  /**
   * 集合在站点的id
   */
  siteWorksId: string | undefined | null
  /**
   * 集合在站点的名称
   */
  siteWorksName: string | undefined | null
  /**
   * 集合在站点的作者id
   */
  siteAuthorId: string | undefined | null
  /**
   * 集合在站点的上传时间
   */
  siteUploadTime: string | undefined | null
  /**
   * 集合在站点最后更新的时间
   */
  siteUpdateTime: string | undefined | null
  /**
   * 别名
   */
  nickName: string | undefined | null
  /**
   * 集合在本地的作者
   */
  localAuthorId: number | undefined | null

  constructor(worksSet: WorksSet) {
    super(worksSet)
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
