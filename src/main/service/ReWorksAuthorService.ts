import BaseService from '../base/BaseService.ts'
import ReWorksAuthorQueryDTO from '../model/queryDTO/ReWorksAuthorQueryDTO.ts'
import ReWorksAuthor from '../model/entity/ReWorksAuthor.ts'
import DB from '../database/DB.ts'
import ReWorksAuthorDao from '../dao/ReWorksAuthorDao.ts'
import { OriginType } from '../constant/OriginType.js'
import { AuthorRank } from '../constant/AuthorRank.js'
import { ArrayNotEmpty } from '../util/CommonUtil.js'

export default class ReWorksAuthorService extends BaseService<ReWorksAuthorQueryDTO, ReWorksAuthor, ReWorksAuthorDao> {
  constructor(db?: DB) {
    super(ReWorksAuthorDao, db)
  }

  /**
   * 关联作品和标签
   * @param type 标签的类型
   * @param authorIdRanks
   * @param worksId
   */
  public async link(type: OriginType, authorIdRanks: { authorId: string; rank: AuthorRank }[], worksId: number) {
    if (authorIdRanks.length === 0) {
      return 0
    }

    // 创建关联对象
    const links = authorIdRanks.map((authorIdRank) => {
      const reWorksAuthor = new ReWorksAuthor()
      if (OriginType.LOCAL === type) {
        reWorksAuthor.worksId = worksId
        reWorksAuthor.localAuthorId = Number(authorIdRank.authorId)
        reWorksAuthor.authorRank = authorIdRank.rank
        reWorksAuthor.authorType = OriginType.LOCAL
      } else {
        reWorksAuthor.worksId = worksId
        reWorksAuthor.siteAuthorId = authorIdRank.authorId
        reWorksAuthor.authorRank = authorIdRank.rank
        reWorksAuthor.authorType = OriginType.SITE
      }
      return reWorksAuthor
    })

    return super.saveBatch(links, true)
  }

  /**
   * 更新作品和标签的关联（全量更新）
   * @param type 标签的类型
   * @param authorIdRanks
   * @param worksId
   */
  public async updateLinks(type: OriginType, authorIdRanks: { authorId: string; rank: AuthorRank }[], worksId: number) {
    if (authorIdRanks.length === 0) {
      return 0
    }

    const oldReList = await this.listByWorksId(worksId, type)

    // 删除已经不存在的关联
    if (ArrayNotEmpty(oldReList)) {
      let notExistingList: ReWorksAuthor[]
      if (type === OriginType.LOCAL) {
        notExistingList = oldReList.filter(
          (oldRe) => !authorIdRanks.some((authorRank) => authorRank.authorId === String(oldRe.localAuthorId))
        )
      } else {
        notExistingList = oldReList.filter((oldRe) => !authorIdRanks.some((authorRank) => authorRank.authorId === oldRe.siteAuthorId))
      }
      if (ArrayNotEmpty(notExistingList)) {
        await this.deleteBatchById(notExistingList.map((notExisting) => notExisting.id as number))
      }
    }
    return this.link(type, authorIdRanks, worksId)
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

  /**
   * 根据作品id查询
   * @param worksId
   * @param type
   */
  public async listByWorksId(worksId: number, type: OriginType): Promise<ReWorksAuthor[]> {
    const query = new ReWorksAuthorQueryDTO()
    query.worksId = worksId
    query.authorType = type
    return this.list(query)
  }
}
