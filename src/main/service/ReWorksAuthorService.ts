import BaseService from './BaseService.ts'
import ReWorksAuthorQueryDTO from '../model/queryDTO/ReWorksAuthorQueryDTO.ts'
import ReWorksAuthor from '../model/entity/ReWorksAuthor.ts'
import DB from '../database/DB.ts'
import ReWorksAuthorDao from '../dao/ReWorksAuthorDao.ts'
import { OriginType } from '../constant/OriginType.js'

export default class ReWorksAuthorService extends BaseService<ReWorksAuthorQueryDTO, ReWorksAuthor, ReWorksAuthorDao> {
  constructor(db?: DB) {
    super('ReWorksAuthorService', new ReWorksAuthorDao(db), db)
  }

  /**
   * 关联作品和标签
   * @param type 标签的类型
   * @param authorIds
   * @param worksId
   */
  public async link(type: OriginType, authorIds: number[], worksId: number) {
    if (authorIds.length === 0) {
      return 0
    }

    // 创建关联对象
    const links = authorIds.map((authorId) => {
      const reWorksAuthor = new ReWorksAuthor()
      if (OriginType.LOCAL === type) {
        reWorksAuthor.worksId = worksId
        reWorksAuthor.localAuthorId = authorId
        reWorksAuthor.authorType = OriginType.LOCAL
      } else {
        reWorksAuthor.worksId = worksId
        reWorksAuthor.localAuthorId = authorId
        reWorksAuthor.authorType = OriginType.SITE
      }
      return reWorksAuthor
    })

    return super.saveBatch(links, true)
  }

  /**
   * 取消作品和标签的关联
   * @param type 标签的类型
   * @param authorIds
   * @param worksId
   */
  public unlink(type: OriginType, authorIds: number[], worksId: number): Promise<number> {
    return this.dao.deleteByWorksIdAndAuthorId(type, authorIds, worksId)
  }
}
