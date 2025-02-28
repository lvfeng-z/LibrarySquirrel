import BaseService from '../base/BaseService.ts'
import WorksSet from '../model/entity/WorksSet.ts'
import WorksSetQueryDTO from '../model/queryDTO/WorksSetQueryDTO.ts'
import DB from '../database/DB.ts'
import WorksSetDao from '../dao/WorksSetDao.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import { IsNullish } from '../util/CommonUtil.ts'
import LogUtil from '../util/LogUtil.ts'
import ReWorksWorksSet from '../model/entity/ReWorksWorksSet.ts'
import ReWorksWorksSetService from './ReWorksWorksSetService.ts'

/**
 * 作品集Service
 */
export default class WorksSetService extends BaseService<WorksSetQueryDTO, WorksSet, WorksSetDao> {
  constructor(db?: DB) {
    super(WorksSetDao, db)
  }

  /**
   * 关联作品集和作品
   * @param worksDTOs
   * @param worksSetId
   */
  link(worksDTOs: WorksDTO[], worksSetId: number) {
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

    // 调用reWorksTagService前区分是否为注入式的DB
    let reWorksTagService: ReWorksWorksSetService
    if (this.injectedDB) {
      reWorksTagService = new ReWorksWorksSetService(this.db)
    } else {
      reWorksTagService = new ReWorksWorksSetService()
    }

    return reWorksTagService.saveBatch(links, true)
  }

  /**
   * 根据作品集在站点的id和入库任务的id查询作品集
   * @param siteWorksSetId 作品集在站点的id
   * @param taskId 入库任务的id
   */
  public async getBySiteWorksSetIdAndTaskId(siteWorksSetId: string, taskId: number): Promise<WorksSet | undefined> {
    return this.dao.getBySiteWorksSetIdAndTaskId(siteWorksSetId, taskId)
  }
}
