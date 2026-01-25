import BaseService from '../base/BaseService.ts'
import ReWorkAuthorQueryDTO from '../model/queryDTO/ReWorkAuthorQueryDTO.ts'
import ReWorkAuthor from '../model/entity/ReWorkAuthor.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import ReWorkAuthorDao from '../dao/ReWorkAuthorDao.ts'
import { OriginType } from '../constant/OriginType.js'
import { AuthorRank } from '../constant/AuthorRank.js'
import { ArrayNotEmpty } from '../util/CommonUtil.js'

export default class ReWorkAuthorService extends BaseService<ReWorkAuthorQueryDTO, ReWorkAuthor, ReWorkAuthorDao> {
  constructor(db?: DatabaseClient) {
    super(ReWorkAuthorDao, db)
  }

  /**
   * 关联作品和标签
   * @param type 标签的类型
   * @param authorIdRanks
   * @param workId
   */
  public async link(type: OriginType, authorIdRanks: { authorId: string; rank: AuthorRank }[], workId: number) {
    if (authorIdRanks.length === 0) {
      return 0
    }

    // 创建关联对象
    const links = authorIdRanks.map((authorIdRank) => {
      const reWorkAuthor = new ReWorkAuthor()
      if (OriginType.LOCAL === type) {
        reWorkAuthor.workId = workId
        reWorkAuthor.localAuthorId = Number(authorIdRank.authorId)
        reWorkAuthor.authorRank = authorIdRank.rank
        reWorkAuthor.authorType = OriginType.LOCAL
      } else {
        reWorkAuthor.workId = workId
        reWorkAuthor.siteAuthorId = authorIdRank.authorId
        reWorkAuthor.authorRank = authorIdRank.rank
        reWorkAuthor.authorType = OriginType.SITE
      }
      return reWorkAuthor
    })

    return super.saveBatch(links, true)
  }

  /**
   * 更新作品和标签的关联（全量更新）
   * @param type 标签的类型
   * @param authorIdRanks
   * @param workId
   */
  public async updateLinks(type: OriginType, authorIdRanks: { authorId: string; rank: AuthorRank }[], workId: number) {
    if (authorIdRanks.length === 0) {
      return 0
    }

    const oldReList = await this.listByWorkId(workId, type)

    // 删除已经不存在的关联
    if (ArrayNotEmpty(oldReList)) {
      let notExistingList: ReWorkAuthor[]
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
    return this.link(type, authorIdRanks, workId)
  }

  /**
   * 取消作品和标签的关联
   * @param type 标签的类型
   * @param authorIds
   * @param workId
   */
  public unlink(type: OriginType, authorIds: number[], workId: number): Promise<number> {
    return this.dao.deleteByWorkIdAndAuthorId(type, authorIds, workId)
  }

  /**
   * 根据作品id查询
   * @param workId
   * @param type
   */
  public async listByWorkId(workId: number, type: OriginType): Promise<ReWorkAuthor[]> {
    const query = new ReWorkAuthorQueryDTO()
    query.workId = workId
    query.authorType = type
    return this.list(query)
  }
}
