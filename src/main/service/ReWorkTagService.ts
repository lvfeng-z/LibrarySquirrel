import BaseService from '../base/BaseService.ts'
import ReWorkTag from '../model/entity/ReWorkTag.ts'
import { ReWorkTagQueryDTO } from '../model/queryDTO/ReWorkTagQueryDTO.ts'
import { ReWorkTagDao } from '../dao/ReWorkTagDao.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import { OriginType } from '../constant/OriginType.js'
import { AssertNotNullish } from '../util/AssertUtil.js'
import { ArrayIsEmpty, ArrayNotEmpty } from '../util/CommonUtil.js'

/**
 * 作品与标签关联Service
 */
export class ReWorkTagService extends BaseService<ReWorkTagQueryDTO, ReWorkTag, ReWorkTagDao> {
  constructor(db?: DatabaseClient) {
    super(ReWorkTagDao, db)
  }

  /**
   * 关联作品和标签
   * @param type 标签的类型
   * @param tagIds
   * @param workId
   */
  public async link(type: OriginType, tagIds: number[], workId: number) {
    AssertNotNullish(workId, this.constructor.name, `关联作品和标签出错，作品id不能为空`)
    if (tagIds.length === 0) {
      return 0
    }

    // 创建关联对象
    const links = tagIds.map((tagId) => {
      const reWorkTag = new ReWorkTag()
      if (OriginType.LOCAL === type) {
        reWorkTag.workId = workId
        reWorkTag.localTagId = tagId
        reWorkTag.tagType = OriginType.LOCAL
      } else {
        reWorkTag.workId = workId
        reWorkTag.siteTagId = tagId
        reWorkTag.tagType = OriginType.SITE
      }
      return reWorkTag
    })

    return super.saveBatch(links, true)
  }

  /**
   * 更新作品和标签的关联（全量更新）
   * @param type 标签的类型
   * @param tagIds
   * @param workId
   */
  public async updateLinks(type: OriginType, tagIds: number[], workId: number) {
    if (ArrayIsEmpty(tagIds)) {
      return 0
    }

    const oldReList = await this.listByWorkId(workId, type)

    // 删除已经不存在的关联
    if (ArrayNotEmpty(oldReList)) {
      const notExistingList = oldReList.filter((oldRe) => !tagIds.some((tagId) => tagId === oldRe.id))
      if (ArrayNotEmpty(notExistingList)) {
        await this.deleteBatchById(notExistingList.map((notExisting) => notExisting.id as number))
      }
    }
    return this.link(type, tagIds, workId)
  }

  /**
   * 取消作品和标签的关联
   * @param type 标签的类型
   * @param tagIds
   * @param workId
   */
  public unlink(type: OriginType, tagIds: number[], workId: number): Promise<number> {
    return this.dao.deleteByWorkIdAndTagId(type, tagIds, workId)
  }

  /**
   * 根据作品id查询
   * @param workId
   * @param type
   */
  public async listByWorkId(workId: number, type: OriginType): Promise<ReWorkTag[]> {
    const query = new ReWorkTagQueryDTO()
    query.workId = workId
    query.tagType = type
    return this.list(query)
  }
}
