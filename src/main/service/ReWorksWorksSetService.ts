import BaseService from '../base/BaseService.ts'
import ReWorksWorksSetQueryDTO from '../model/queryDTO/ReWorksWorksSetQueryDTO.ts'
import ReWorksWorksSet from '../model/entity/ReWorksWorksSet.ts'
import ReWorksWorksSetDao from '../dao/ReWorksWorksSetDao.ts'
import DB from '../database/DB.ts'
import WorksDTO from '../model/dto/WorksDTO.js'
import { IsNullish } from '../util/CommonUtil.js'
import LogUtil from '../util/LogUtil.js'

export default class ReWorksWorksSetService extends BaseService<ReWorksWorksSetQueryDTO, ReWorksWorksSet, ReWorksWorksSetDao> {
  constructor(db?: DB) {
    super(ReWorksWorksSetDao, db)
  }

  /**
   * 关联作品集和作品
   * @param worksDTOs
   * @param worksSetId
   */
  public async link(worksDTOs: WorksDTO[], worksSetId: number): Promise<number> {
    // 校验
    const legalWorksList = worksDTOs.filter((works) => {
      if (IsNullish(works)) {
        LogUtil.warn('WorksSetService', `关联作品集和作品失败，作品信息意外为空`)
        return false
      }
      if (IsNullish(!Object.hasOwn(works, 'id') || works.id)) {
        const siteWorksName = Object.hasOwn(works, 'siteWorksName') ? works.siteWorksName : 'unknown'
        LogUtil.warn('WorksSetService', `关联作品集和作品失败，作品id意外为空，siteWorksName: ${siteWorksName}`)
        return false
      }
      return true
    })

    if (legalWorksList.length === 0) {
      return 0
    }

    // 创建关联对象
    const links = legalWorksList.map((worksDTO) => {
      const reWorksWorksSet = new ReWorksWorksSet()
      reWorksWorksSet.worksId = worksDTO.id
      reWorksWorksSet.worksSetId = worksSetId
      return reWorksWorksSet
    })

    return this.saveBatch(links, true)
  }
}
