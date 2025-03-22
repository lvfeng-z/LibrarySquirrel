import BaseService from '../base/BaseService.ts'
import ReWorksAuthorQueryDTO from '../model/queryDTO/ReWorksAuthorQueryDTO.ts'
import ReWorksAuthor from '../model/entity/ReWorksAuthor.ts'
import DB from '../database/DB.ts'
import ReWorksAuthorDao from '../dao/ReWorksAuthorDao.ts'
import { OriginType } from '../constant/OriginType.js'
import { AuthorRole } from '../constant/AuthorRole.js'
import { ArrayNotEmpty } from '../util/CommonUtil.js'

export default class ReWorksAuthorService extends BaseService<ReWorksAuthorQueryDTO, ReWorksAuthor, ReWorksAuthorDao> {
  constructor(db?: DB) {
    super(ReWorksAuthorDao, db)
  }

  /**
   * 关联作品和标签
   * @param type 标签的类型
   * @param authorIdRoles
   * @param worksId
   */
  public async link(type: OriginType, authorIdRoles: { authorId: number; role: AuthorRole }[], worksId: number) {
    if (authorIdRoles.length === 0) {
      return 0
    }

    // 创建关联对象
    const links = authorIdRoles.map((authorIdRole) => {
      const reWorksAuthor = new ReWorksAuthor()
      if (OriginType.LOCAL === type) {
        reWorksAuthor.worksId = worksId
        reWorksAuthor.localAuthorId = authorIdRole.authorId
        reWorksAuthor.authorRole = authorIdRole.role
        reWorksAuthor.authorType = OriginType.LOCAL
      } else {
        reWorksAuthor.worksId = worksId
        reWorksAuthor.siteAuthorId = authorIdRole.authorId
        reWorksAuthor.authorRole = authorIdRole.role
        reWorksAuthor.authorType = OriginType.SITE
      }
      return reWorksAuthor
    })

    return super.saveBatch(links, true)
  }

  /**
   * 更新作品和标签的关联（全量更新）
   * @param type 标签的类型
   * @param authorIdRoles
   * @param worksId
   */
  public async updateLinks(type: OriginType, authorIdRoles: { authorId: number; role: AuthorRole }[], worksId: number) {
    if (authorIdRoles.length === 0) {
      return 0
    }

    const oldReList = await this.listByWorksId(worksId, type)

    // 删除已经不存在的关联
    if (ArrayNotEmpty(oldReList)) {
      const notExistingList = oldReList.filter((oldRe) => !authorIdRoles.some((authorRole) => authorRole.authorId === oldRe.id))
      if (ArrayNotEmpty(notExistingList)) {
        await this.deleteBatchById(notExistingList.map((notExisting) => notExisting.id as number))
      }
    }
    return this.link(type, authorIdRoles, worksId)
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
