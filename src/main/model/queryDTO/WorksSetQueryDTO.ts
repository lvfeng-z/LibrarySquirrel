import BaseQueryDTO from './BaseQueryDTO.ts'

export default class WorksSetQueryDTO extends BaseQueryDTO {
  /**
   * 主键
   */
  id: number | undefined | null
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

  constructor(worksSetQueryDTO?: WorksSetQueryDTO) {
    if (worksSetQueryDTO === undefined || worksSetQueryDTO === null) {
      super()
      this.id = undefined
      this.setName = undefined
      this.siteId = undefined
      this.siteWorksId = undefined
      this.siteWorksName = undefined
      this.siteAuthorId = undefined
      this.siteUploadTime = undefined
      this.siteUpdateTime = undefined
      this.nickName = undefined
      this.localAuthorId = undefined
      this.createTime = undefined
    } else {
      super(worksSetQueryDTO)
      this.id = worksSetQueryDTO.id
      this.setName = worksSetQueryDTO.setName
      this.siteId = worksSetQueryDTO.siteId
      this.siteWorksId = worksSetQueryDTO.siteWorksId
      this.siteWorksName = worksSetQueryDTO.siteWorksName
      this.siteAuthorId = worksSetQueryDTO.siteAuthorId
      this.siteUploadTime = worksSetQueryDTO.siteUploadTime
      this.siteUpdateTime = worksSetQueryDTO.siteUpdateTime
      this.nickName = worksSetQueryDTO.nickName
      this.localAuthorId = worksSetQueryDTO.localAuthorId
      this.createTime = worksSetQueryDTO.createTime
    }
  }
}
