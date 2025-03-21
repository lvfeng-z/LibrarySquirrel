import { BaseQueryDTO } from '../../base/BaseQueryDTO.js'
import { IsNullish } from '../../util/CommonUtil.ts'

export default class WorksSetQueryDTO extends BaseQueryDTO {
  /**
   * 主键
   */
  id: number | undefined | null
  /**
   * 集合来源站点id
   */
  siteId: number | undefined | null
  /**
   * 集合在站点的id
   */
  siteWorksSetId: string | string[] | undefined | null
  /**
   * 集合在站点的名称
   */
  siteWorksSetName: string | undefined | null
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
   * 最后一次查看的时间
   */
  lastView: number | undefined | null

  constructor(worksSetQueryDTO?: WorksSetQueryDTO) {
    if (IsNullish(worksSetQueryDTO)) {
      super()
      this.id = undefined
      this.siteId = undefined
      this.siteWorksSetId = undefined
      this.siteWorksSetName = undefined
      this.siteAuthorId = undefined
      this.siteUploadTime = undefined
      this.siteUpdateTime = undefined
      this.nickName = undefined
      this.lastView = undefined
    } else {
      super(worksSetQueryDTO)
      this.id = worksSetQueryDTO.id
      this.siteId = worksSetQueryDTO.siteId
      this.siteWorksSetId = worksSetQueryDTO.siteWorksSetId
      this.siteWorksSetName = worksSetQueryDTO.siteWorksSetName
      this.siteAuthorId = worksSetQueryDTO.siteAuthorId
      this.siteUploadTime = worksSetQueryDTO.siteUploadTime
      this.siteUpdateTime = worksSetQueryDTO.siteUpdateTime
      this.nickName = worksSetQueryDTO.nickName
      this.lastView = worksSetQueryDTO.lastView
    }
  }
}
