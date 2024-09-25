import BaseService from './BaseService.ts'
import ReWorksTag from '../model/ReWorksTag.ts'
import { ReWorksTagQueryDTO } from '../model/queryDTO/ReWorksTagQueryDTO.ts'
import { ReWorksTagDao } from '../dao/ReWorksTagDao.ts'
import DB from '../database/DB.ts'
import { ReWorksTagTypeEnum } from '../constant/ReWorksTagTypeEnum.js'

/**
 * 作品与标签关联Service
 */
export class ReWorksTagService extends BaseService<ReWorksTagQueryDTO, ReWorksTag, ReWorksTagDao> {
  constructor(db?: DB) {
    super('ReWorksTagService', new ReWorksTagDao(db), db)
  }

  /**
   * 关联作品和标签
   * @param localTagIds
   * @param worksId
   */
  public async link(localTagIds: number[], worksId: number) {
    if (localTagIds.length === 0) {
      return 0
    }

    // 创建关联对象
    const links = localTagIds.map((localTagId) => {
      const reWorksTag = new ReWorksTag()
      reWorksTag.worksId = worksId
      reWorksTag.localTagId = localTagId
      reWorksTag.tagType = ReWorksTagTypeEnum.LOCAL
      return reWorksTag
    })

    return super.saveBatch(links, true)
  }

  /**
   * 取消作品和标签的关联
   * @param localTagIds
   * @param worksId
   */
  public unlink(localTagIds: number[], worksId: number): Promise<number> {
    return this.dao.deleteByWorksIdAndLocalTagId(localTagIds, worksId)
  }
}
