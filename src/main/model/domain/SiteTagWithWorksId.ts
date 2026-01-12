import SiteTag from '../entity/SiteTag.ts'

export default class SiteTagWithWorksId extends SiteTag {
  /**
   * 作品id
   */
  worksId: number | undefined | null
}
