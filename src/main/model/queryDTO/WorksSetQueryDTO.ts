import BaseQueryDTO from './BaseQueryDTO.ts'
import { isNullish } from '../../util/CommonUtil.ts'

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
  siteWorksSetId: string | undefined | null
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
   * 收录方式（0：本地导入，1：站点下载）
   */
  includeMode: number | undefined | null
  /**
   * 收录任务id
   */
  includeTaskId: number | undefined | null
  /**
   * 最后一次查看的时间
   */
  lastViewed: number | undefined | null

  constructor(worksSetQueryDTO?: WorksSetQueryDTO) {
    if (isNullish(worksSetQueryDTO)) {
      super()
      this.id = undefined
      this.setName = undefined
      this.siteId = undefined
      this.siteWorksSetId = undefined
      this.siteWorksSetName = undefined
      this.siteAuthorId = undefined
      this.siteUploadTime = undefined
      this.siteUpdateTime = undefined
      this.nickName = undefined
      this.includeMode = undefined
      this.includeTaskId = undefined
      this.lastViewed = undefined
    } else {
      super(worksSetQueryDTO)
      this.id = worksSetQueryDTO.id
      this.setName = worksSetQueryDTO.setName
      this.siteId = worksSetQueryDTO.siteId
      this.siteWorksSetId = worksSetQueryDTO.siteWorksSetId
      this.siteWorksSetName = worksSetQueryDTO.siteWorksSetName
      this.siteAuthorId = worksSetQueryDTO.siteAuthorId
      this.siteUploadTime = worksSetQueryDTO.siteUploadTime
      this.siteUpdateTime = worksSetQueryDTO.siteUpdateTime
      this.nickName = worksSetQueryDTO.nickName
      this.includeMode = worksSetQueryDTO.includeMode
      this.includeTaskId = worksSetQueryDTO.includeTaskId
      this.lastViewed = worksSetQueryDTO.lastViewed
    }
  }
}
