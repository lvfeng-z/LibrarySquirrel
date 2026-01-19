import Resource from '@renderer/model/main/entity/Resource.ts'
import RankedLocalAuthor from '@renderer/model/main/domain/RankedLocalAuthor.ts'
import RankedSiteAuthor from '@renderer/model/main/domain/RankedSiteAuthor.ts'
import WorksFullDTO from '@renderer/model/main/dto/WorksFullDTO.ts'
import WorksSetWithWorksDTO from '@renderer/model/main/dto/WorksSetWithWorksDTO.ts'
import { ArrayNotEmpty, NotNullish } from '@renderer/utils/CommonUtil.ts'

export default class WorksCardItem {
  /**
   * 主键
   */
  id: number | undefined | null
  /**
   * 站点作品名称
   */
  siteItemName: string | undefined | null
  /**
   * 别称
   */
  nickName: string | undefined | null
  /**
   * 简介
   */
  description: string | undefined | null
  /**
   * 资源
   */
  resource: Resource | undefined | null
  /**
   * 本地作者列表
   */
  localAuthors: RankedLocalAuthor[] | undefined | null
  /**
   * 站点作者列表
   */
  siteAuthors: RankedSiteAuthor[] | undefined | null

  constructor(source: WorksFullDTO | WorksSetWithWorksDTO) {
    if (source instanceof WorksFullDTO) {
      this.id = source.id
      this.siteItemName = source.siteWorksName
      this.nickName = source.nickName
      this.description = source.siteWorkDescription
      this.resource = source.resource
      this.localAuthors = source.localAuthors
      this.siteAuthors = source.siteAuthors
    } else {
      this.id = source.worksSet.id
      this.siteItemName = source.worksSet.siteWorksSetName
      this.nickName = source.worksSet.nickName
      this.description = source.worksSet.siteWorkSetDescription
      this.resource = source.worksList[0].resource
      const seenIds = new Set()
      this.localAuthors = []
      // 从作品中提取本地作者并去重
      source.worksList.forEach((worksFullInfo) => {
        if (ArrayNotEmpty(worksFullInfo.localAuthors)) {
          worksFullInfo.localAuthors.forEach((localAuthor) => {
            if (NotNullish(localAuthor.id)) {
              if (!seenIds.has(localAuthor.id)) {
                seenIds.add(localAuthor.id)
                if (NotNullish(this.localAuthors)) {
                  this.localAuthors.push(localAuthor)
                }
              }
            }
          })
        }
      })
      // 从作品中提取站点作者并去重
      this.siteAuthors = []
      seenIds.clear()
      source.worksList.forEach((worksFullInfo) => {
        if (ArrayNotEmpty(worksFullInfo.siteAuthors)) {
          worksFullInfo.siteAuthors.forEach((siteAuthor) => {
            if (NotNullish(siteAuthor.id)) {
              if (!seenIds.has(siteAuthor.id)) {
                seenIds.add(siteAuthor.id)
                if (NotNullish(this.siteAuthors)) {
                  this.siteAuthors.push(siteAuthor)
                }
              }
            }
          })
        }
      })
    }
  }
}
