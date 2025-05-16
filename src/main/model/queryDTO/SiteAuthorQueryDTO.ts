import { BaseQueryDTO } from '../../base/BaseQueryDTO.js'
import { NotNullish } from '../../util/CommonUtil.js'

/**
 * QueryDTO
 * 站点作者
 */
export default class SiteAuthorQueryDTO extends BaseQueryDTO {
  /**
   * 作者来源站点id
   */
  siteId?: number | undefined | null
  /**
   * 站点中作者的id
   */
  siteAuthorId?: string | undefined | null
  /**
   * 站点中作者的名称
   */
  siteAuthorName?: string | undefined | null
  /**
   * 站点中作者的曾用名
   */
  siteAuthorNameBefore?: string[] | string | undefined | null
  /**
   * 介绍
   */
  introduce?: string | undefined | null
  /**
   * 站点作者在本地对应的作者id
   */
  localAuthorId?: number | undefined | null
  /**
   * 最后一次使用的时间
   */
  lastUse?: number | null | undefined
  /**
   * 标签来源站点id列表
   */
  sites?: string[] | undefined | null
  /**
   * 查询绑定在LocalAuthor上的，还是未绑定的（true：绑定的，false：未绑定的）
   */
  boundOnLocalAuthorId?: boolean | undefined | null

  /**
   * 作品id
   */
  worksId?: number | null | undefined

  /**
   * 查询绑定在worksId上的，还是未绑定的（true：绑定的，false：未绑定的）
   */
  boundOnWorksId?: boolean | undefined | null

  constructor(siteAuthorQueryDTO?: SiteAuthorQueryDTO) {
    super(siteAuthorQueryDTO)
    if (NotNullish(siteAuthorQueryDTO)) {
      this.siteId = siteAuthorQueryDTO.siteId
      this.siteAuthorId = siteAuthorQueryDTO.siteAuthorId
      this.siteAuthorName = siteAuthorQueryDTO.siteAuthorName
      this.siteAuthorNameBefore = siteAuthorQueryDTO.siteAuthorNameBefore
      this.introduce = siteAuthorQueryDTO.introduce
      this.localAuthorId = siteAuthorQueryDTO.localAuthorId
      this.lastUse = siteAuthorQueryDTO.lastUse
      this.sites = siteAuthorQueryDTO.sites
      this.boundOnLocalAuthorId = siteAuthorQueryDTO.boundOnLocalAuthorId
      this.worksId = siteAuthorQueryDTO.worksId
      this.boundOnWorksId = siteAuthorQueryDTO.boundOnWorksId
    }
  }

  public static nonFieldProperties(): string[] {
    return [...BaseQueryDTO.nonFieldProperties(), 'sites', 'boundOnLocalAuthorId', 'worksId', 'boundOnWorksId']
  }
}
