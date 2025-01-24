import BaseService from './BaseService.ts'
import ReWorksTag from '../model/entity/ReWorksTag.ts'
import { ReWorksTagQueryDTO } from '../model/queryDTO/ReWorksTagQueryDTO.ts'
import { ReWorksTagDao } from '../dao/ReWorksTagDao.ts'
import DB from '../database/DB.ts'
import { OriginType } from '../constant/OriginType.js'
import { AssertNotNullish } from '../util/AssertUtil.js'

/**
 * 作品与标签关联Service
 */
export class ReWorksTagService extends BaseService<ReWorksTagQueryDTO, ReWorksTag, ReWorksTagDao> {
  constructor(db?: DB) {
    super(ReWorksTagDao, db)
  }

  /**
   * 关联作品和标签
   * @param type 标签的类型
   * @param tagIds
   * @param worksId
   */
  public async link(type: OriginType, tagIds: number[], worksId: number) {
    AssertNotNullish(worksId, this.constructor.name, `关联作品和标签出错，作品id不能为空`)
    if (tagIds.length === 0) {
      return 0
    }

    // 创建关联对象
    const links = tagIds.map((tagId) => {
      const reWorksTag = new ReWorksTag()
      if (OriginType.LOCAL === type) {
        reWorksTag.worksId = worksId
        reWorksTag.localTagId = tagId
        reWorksTag.tagType = OriginType.LOCAL
      } else {
        reWorksTag.worksId = worksId
        reWorksTag.siteTagId = tagId
        reWorksTag.tagType = OriginType.SITE
      }
      return reWorksTag
    })

    return super.saveBatch(links, true)
  }

  /**
   * 取消作品和标签的关联
   * @param type 标签的类型
   * @param tagIds
   * @param worksId
   */
  public unlink(type: OriginType, tagIds: number[], worksId: number): Promise<number> {
    return this.dao.deleteByWorksIdAndTagId(type, tagIds, worksId)
  }
}
