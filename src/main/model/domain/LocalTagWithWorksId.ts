import LocalTag from '../entity/LocalTag.ts'

export default class LocalTagWithWorksId extends LocalTag {
  /**
   * 作品id
   */
  worksId: number | undefined | null
}
